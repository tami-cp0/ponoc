import type { LiveStatus, ServerEvent } from "@/shared/protocol";
import type { LiveSession } from "../gateway";
import type { LLMProvider } from "../llm/provider";
import type { Prices } from "../usage/pricing";
import { Transcriber } from "../stt/deepgram";
import { ClaimQueue } from "./ClaimQueue";
import { Segmenter } from "./Segmenter";
import { UsageMeter, type UsageSnapshot } from "../usage/UsageMeter";

// Utterances of context given to triage, so "it" can be resolved.
const TRIAGE_CONTEXT = 3;
// How long claims already heard may keep verifying after Stop.
const DRAIN_TIMEOUT_MS = 20_000;

// One live session: audio → Deepgram → utterances → triage → verify → verdicts.
export class Session implements LiveSession {
  private readonly meter: UsageMeter;
  private readonly segmenter = new Segmenter();
  private readonly transcriber: Transcriber;
  private readonly queue: ClaimQueue;
  private readonly recentUtterances: string[] = [];
  private readonly triages = new Set<Promise<void>>();

  constructor(
    private readonly provider: LLMProvider,
    private readonly send: (event: ServerEvent) => void,
    prices: Prices,
  ) {
    this.meter = new UsageMeter(prices);
    this.transcriber = new Transcriber({
      onFinal: (text) => this.onFinal(text),
      // A dropped speech-to-text connection ends the session; the gateway then
      // closes the socket, and the user presses Start again.
      onDropped: () => this.status("stopped"),
    });

    this.queue = new ClaimQueue({
      verify: (id, text) => this.verify(id, text),
      onSpawned: (id, text) => this.send({ type: "claim:spawned", id, text }),
      // The card still needs an answer, so a failed check lands as unsure.
      onError: (id, message) => {
        this.meter.addError();
        this.meter.addVerdict(null);
        console.error("verify failed:", message);
        this.send({ type: "claim:verdict", id, result: { verdict: null, reasoning: "The check didn't go through." } });
      },
    });
  }

  async start(): Promise<void> {
    await this.transcriber.start();
    this.status("listening");
  }

  usage(): UsageSnapshot {
    return this.meter.snapshot();
  }

  audio(chunk: Buffer): void {
    if (this.transcriber.send(chunk)) this.meter.addAudio(chunk.byteLength);
  }

  // Claims already heard still get verified (and billed), up to a time limit.
  async close(): Promise<void> {
    this.transcriber.stop();
    this.status("stopped");
    for (const utterance of this.segmenter.flush()) this.triage(utterance);
    await settleWithin(this.settle(), DRAIN_TIMEOUT_MS);
  }

  private async settle(): Promise<void> {
    await Promise.all([...this.triages]);
    await this.queue.drain();
  }

  private status(state: LiveStatus): void {
    this.send({ type: "status", state });
  }

  private onFinal(text: string): void {
    for (const utterance of this.segmenter.push(text)) this.triage(utterance);
  }

  private triage(utterance: string): void {
    const context = [...this.recentUtterances];
    this.recentUtterances.push(utterance);
    if (this.recentUtterances.length > TRIAGE_CONTEXT) this.recentUtterances.shift();

    const task: Promise<void> = this.provider
      .triage(utterance, context)
      .then((result) => {
        this.meter.addCall(result.usage);
        if (result.claim) this.queue.add(result.claim, result.priority, Date.now());
      })
      .catch((err: Error) => console.error("triage failed:", err.message))
      .finally(() => this.triages.delete(task));
    this.triages.add(task);
  }

  private async verify(id: string, text: string): Promise<void> {
    const { verdict, usage } = await this.provider.verify(text);
    this.meter.addCall(usage);
    if (!verdict) throw new Error("unreadable verdict");
    this.meter.addVerdict(verdict.verdict);
    this.send({ type: "claim:verdict", id, result: verdict });
  }
}

function settleWithin(work: Promise<void>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const limit = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([work, limit]).finally(() => clearTimeout(timer));
}
