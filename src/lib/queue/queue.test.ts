import { describe, expect, it, vi } from "vitest";
import { ClaimQueue } from "./queue";
import type { Verdict } from "../types";

const ok = (): Verdict => ({ verdict: true, reasoning: "yes" });

function makeQueue(verify: (text: string) => Promise<Verdict>) {
  const spawned: string[] = [];
  const verdicts: string[] = [];
  const q = new ClaimQueue({
    verify,
    onSpawned: (c) => spawned.push(c.text),
    onVerdict: (id) => verdicts.push(id),
    onError: () => {},
  });
  return { q, spawned, verdicts };
}

describe("ClaimQueue", () => {
  it("spawns a card for a new claim", () => {
    const { q, spawned } = makeQueue(async () => ok());
    q.add("The sky is blue", "low", 1000);
    expect(spawned).toEqual(["The sky is blue"]);
  });

  it("drops a near-duplicate within the time window", () => {
    const { q, spawned } = makeQueue(async () => ok());
    q.add("GDP grew four percent", "low", 1000);
    q.add("GDP grew 4 percent", "low", 2000);
    expect(spawned).toHaveLength(1);
  });

  it("does not treat an old similar claim as a duplicate", () => {
    const { q, spawned } = makeQueue(async () => ok());
    q.add("GDP grew four percent", "low", 1000);
    q.add("GDP grew four percent", "low", 20000);
    expect(spawned).toHaveLength(2);
  });

  it("verifies each spawned claim and reports its verdict", async () => {
    const { q, verdicts } = makeQueue(async () => ok());
    q.add("The sky is blue", "low", 1000);
    await q.drain();
    expect(verdicts).toHaveLength(1);
  });

  it("respects max concurrency", async () => {
    let active = 0;
    let peak = 0;
    const verify = vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return ok();
    });
    const { q } = makeQueue(verify);
    for (let i = 0; i < 10; i++) q.add(`distinct claim number ${i}`, "low", i * 100);
    await q.drain();
    expect(peak).toBeLessThanOrEqual(3);
    expect(verify).toHaveBeenCalledTimes(10);
  });

  it("verifies high-priority claims before low-priority ones", async () => {
    const order: string[] = [];
    const verify = vi.fn(async (text: string) => {
      order.push(text);
      return ok();
    });
    const q = new ClaimQueue({
      verify,
      onSpawned: () => {},
      onVerdict: () => {},
      onError: () => {},
      maxConcurrent: 1,
    });
    q.add("low one", "low", 1000);
    q.add("high one", "high", 1100);
    await q.drain();
    expect(order[0]).toBe("low one");
    expect(order).toContain("high one");
  });

  it("reports an error verdict when verification throws", async () => {
    const errors: string[] = [];
    const q = new ClaimQueue({
      verify: async () => {
        throw new Error("network down");
      },
      onSpawned: () => {},
      onVerdict: () => {},
      onError: (id) => errors.push(id),
    });
    q.add("some claim", "low", 1000);
    await q.drain();
    expect(errors).toHaveLength(1);
  });
});
