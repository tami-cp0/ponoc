import { randomUUID } from "node:crypto";
import { similarity } from "./dedup";

const DEDUP_WINDOW_MS = 8000;
const DEDUP_SIMILARITY = 0.85;
const MAX_CONCURRENT_VERIFY = 3;

type Priority = "high" | "low";

interface Claim {
  id: string;
  text: string;
  priority: Priority;
}

export interface QueueOptions {
  verify: (id: string, text: string) => Promise<void>;
  onSpawned: (id: string, text: string) => void;
  onError: (id: string, message: string) => void;
  maxConcurrent?: number;
}

// Deduplicates claims, then verifies them with bounded concurrency, high
// priority first. The verify callback owns what happens with a result; the
// queue only reports failures.
export class ClaimQueue {
  private readonly recent: { text: string; at: number }[] = [];
  private readonly pending: Claim[] = [];
  private readonly inFlight = new Set<Promise<void>>();
  private readonly maxConcurrent: number;

  constructor(private readonly options: QueueOptions) {
    this.maxConcurrent = options.maxConcurrent ?? MAX_CONCURRENT_VERIFY;
  }

  add(text: string, priority: Priority, at: number): void {
    if (this.isDuplicate(text, at)) return;
    this.recent.push({ text, at });

    const claim: Claim = { id: randomUUID(), text, priority };
    this.options.onSpawned(claim.id, claim.text);
    this.pending.push(claim);
    this.pump();
  }

  async drain(): Promise<void> {
    while (this.inFlight.size > 0) {
      await Promise.all([...this.inFlight]);
    }
  }

  private isDuplicate(text: string, at: number): boolean {
    const cutoff = at - DEDUP_WINDOW_MS;
    return this.recent.some(
      (r) => r.at >= cutoff && similarity(text, r.text) >= DEDUP_SIMILARITY,
    );
  }

  private pump(): void {
    while (this.inFlight.size < this.maxConcurrent && this.pending.length > 0) {
      const next = this.pending.findIndex((c) => c.priority === "high");
      const [claim] = this.pending.splice(next === -1 ? 0 : next, 1);
      this.run(claim);
    }
  }

  private run(claim: Claim): void {
    const task: Promise<void> = this.options
      .verify(claim.id, claim.text)
      .catch((err: Error) => this.options.onError(claim.id, err?.message ?? "verification failed"))
      .finally(() => {
        this.inFlight.delete(task);
        this.pump();
      });
    this.inFlight.add(task);
  }
}
