import { randomUUID } from "node:crypto";
import { config } from "../config";
import type { Claim, Verdict } from "../types";
import { similarity } from "./dedup";

interface QueueOptions {
  verify: (text: string) => Promise<Verdict>;
  onSpawned: (claim: Claim) => void;
  onVerdict: (id: string, result: Verdict) => void;
  onError: (id: string, message: string) => void;
  maxConcurrent?: number;
  dedupWindowMs?: number;
  dedupSimilarity?: number;
}

export class ClaimQueue {
  private readonly opts: Required<QueueOptions>;
  private readonly recent: { text: string; at: number }[] = [];
  private readonly pending: Claim[] = [];
  private running = 0;
  private readonly inFlight = new Set<Promise<void>>();

  constructor(opts: QueueOptions) {
    this.opts = {
      maxConcurrent: config.queue.maxConcurrentVerify,
      dedupWindowMs: config.queue.dedupWindowMs,
      dedupSimilarity: config.queue.dedupSimilarity,
      ...opts,
    };
  }

  add(text: string, priority: "high" | "low", at: number): void {
    if (this.isDuplicate(text, at)) return;
    this.recent.push({ text, at });

    const claim: Claim = { id: randomUUID(), text, priority, at };
    this.opts.onSpawned(claim);
    this.pending.push(claim);
    this.pump();
  }

  async drain(): Promise<void> {
    while (this.inFlight.size > 0) {
      await Promise.all([...this.inFlight]);
    }
  }

  private isDuplicate(text: string, at: number): boolean {
    const cutoff = at - this.opts.dedupWindowMs;
    for (const r of this.recent) {
      if (r.at < cutoff) continue;
      if (similarity(text, r.text) >= this.opts.dedupSimilarity) return true;
    }
    return false;
  }

  private pump(): void {
    while (this.running < this.opts.maxConcurrent && this.pending.length > 0) {
      this.pending.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1));
      const claim = this.pending.shift()!;
      this.run(claim);
    }
  }

  private run(claim: Claim): void {
    this.running++;
    const task = this.opts
      .verify(claim.text)
      .then((result) => this.opts.onVerdict(claim.id, result))
      .catch((err) => this.opts.onError(claim.id, err?.message ?? "verification failed"))
      .finally(() => {
        this.running--;
        this.inFlight.delete(task);
        this.pump();
      });
    this.inFlight.add(task);
  }
}
