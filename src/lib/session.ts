import { config } from "./config";
import type { LLMProvider } from "./llm/provider";
import { ClaimQueue } from "./queue/queue";
import { Segmenter } from "./segment/segment";
import { DeepgramRelay } from "./stt/relay";
import type { ServerEvent } from "./types";

export class Session {
  private readonly relay: DeepgramRelay;
  private readonly segmenter = new Segmenter();
  private readonly queue: ClaimQueue;
  private readonly window: string[] = [];

  constructor(
    private readonly provider: LLMProvider,
    private readonly send: (event: ServerEvent) => void,
  ) {
    this.relay = new DeepgramRelay({
      onTranscript: (text, final) => this.onTranscript(text, final),
      onClose: () => this.send({ type: "status", state: "reconnecting" }),
      onError: () => this.send({ type: "status", state: "reconnecting" }),
    });

    this.queue = new ClaimQueue({
      verify: (text) => {
        console.log("[5] verify → LLM:", text);
        return this.provider.verify(text).then((r) => {
          console.log("[5] verdict:", r.verdict, "—", r.reasoning);
          return r;
        });
      },
      onSpawned: (claim) => {
        console.log("[4] queued claim:", claim.text);
        this.send({ type: "claim:spawned", claim });
      },
      onVerdict: (id, result) => this.send({ type: "claim:verdict", id, result }),
      onError: (id, message) => this.send({ type: "claim:error", id, message }),
    });
  }

  async start(): Promise<void> {
    console.log("[1] STT connecting to Deepgram…");
    await this.relay.start();
    console.log("[1] STT connected — listening");
    this.send({ type: "status", state: "listening" });
  }

  audio(chunk: ArrayBufferView): void {
    this.relay.send(chunk);
  }

  stop(): void {
    this.relay.stop();
    for (const utterance of this.segmenter.flush()) void this.triage(utterance);
    this.send({ type: "status", state: "stopped" });
  }

  private onTranscript(text: string, final: boolean): void {
    this.send({ type: "transcript", text, final });
    if (!final) return;
    console.log("[1] STT final:", text);
    for (const utterance of this.segmenter.push(text)) {
      console.log("[2] segment:", utterance);
      void this.triage(utterance);
    }
  }

  private async triage(utterance: string): Promise<void> {
    const context = this.window.slice(-config.triage.windowSize);
    this.window.push(utterance);

    try {
      const result = await this.provider.triage(utterance, context);
      console.log(
        "[3] triage:",
        result.claim_type,
        result.is_checkable_now ? "✓ checkable" : "✗ skip",
        result.canonical_claim ? `→ ${result.canonical_claim}` : "",
      );
      if (result.is_checkable_now && result.canonical_claim) {
        this.queue.add(result.canonical_claim, result.priority, Date.now());
      }
    } catch (err) {
      console.log("[3] triage failed:", (err as Error).message);
    }
  }
}
