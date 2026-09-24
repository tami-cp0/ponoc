import { config } from "./config";
import type { LLMProvider } from "./llm/provider";
import { ClaimQueue } from "./queue/queue";
import { Segmenter } from "./segment/segment";
import { DeepgramRelay } from "./stt/relay";
import type { ServerEvent, TokenUsage } from "./types";
import { UsageMeter, cardTotal } from "./usage";

export class Session {
  private readonly relay: DeepgramRelay;
  private readonly segmenter = new Segmenter();
  private readonly queue: ClaimQueue;
  private readonly window: string[] = [];
  // Running token spend for this session, plus the triage cost of each queued
  // claim so a card's total (triage + verify) can be reported when it resolves.
  private readonly usage = new UsageMeter();
  private readonly triageCost = new Map<string, TokenUsage | undefined>();

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
      onVerdict: (id, result) => {
        this.send({ type: "claim:verdict", id, result });
        // A card's cost is its triage + verify spend. Fold verify into the
        // session total, then report both the per-card total and the new
        // running session total.
        this.usage.record(result.usage);
        const triage = this.triageCost.get(id);
        this.triageCost.delete(id);
        const card = cardTotal(triage, result.usage);
        console.log("[6] tokens — card:", card, "session:", this.usage.total.total);
        this.send({ type: "usage", card, session: this.usage.total });
      },
      onError: (id, message) => {
        this.triageCost.delete(id);
        this.send({ type: "claim:error", id, message });
      },
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
      // Every triage call costs tokens, checkable or not — fold it into the
      // session total now. If it produces a card, stash its cost against the
      // claim id so the verdict can bundle it into the card total.
      this.usage.record(result.usage);
      if (result.is_checkable_now && result.canonical_claim) {
        const id = this.queue.add(result.canonical_claim, result.priority, Date.now());
        if (id) this.triageCost.set(id, result.usage);
      }
    } catch (err) {
      console.log("[3] triage failed:", (err as Error).message);
    }
  }
}
