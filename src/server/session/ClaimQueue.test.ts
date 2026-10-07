import { describe, expect, it, vi } from "vitest";
import { ClaimQueue } from "./ClaimQueue";

function makeQueue(verify: (id: string, text: string) => Promise<void>, maxConcurrent?: number) {
  const spawned: string[] = [];
  const errors: string[] = [];
  const queue = new ClaimQueue({
    verify,
    onSpawned: (_id, text) => spawned.push(text),
    onError: (id) => errors.push(id),
    maxConcurrent,
  });
  return { queue, spawned, errors };
}

describe("ClaimQueue", () => {
  it("spawns a card for a new claim", () => {
    const { queue, spawned } = makeQueue(async () => {});
    queue.add("The sky is blue", "low", 1000);
    expect(spawned).toEqual(["The sky is blue"]);
  });

  it("drops a near-duplicate within the time window", () => {
    const { queue, spawned } = makeQueue(async () => {});
    queue.add("GDP grew four percent", "low", 1000);
    queue.add("GDP grew 4 percent", "low", 2000);
    expect(spawned).toHaveLength(1);
  });

  it("does not treat an old similar claim as a duplicate", () => {
    const { queue, spawned } = makeQueue(async () => {});
    queue.add("GDP grew four percent", "low", 1000);
    queue.add("GDP grew four percent", "low", 20000);
    expect(spawned).toHaveLength(2);
  });

  it("verifies each spawned claim with its id", async () => {
    const ids: string[] = [];
    let spawnedId = "";
    const queue = new ClaimQueue({
      verify: async (id) => {
        ids.push(id);
      },
      onSpawned: (id) => {
        spawnedId = id;
      },
      onError: () => {},
    });
    queue.add("The sky is blue", "low", 1000);
    await queue.drain();
    expect(ids).toEqual([spawnedId]);
  });

  it("respects max concurrency", async () => {
    let active = 0;
    let peak = 0;
    const verify = vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });
    const { queue } = makeQueue(verify);
    for (let i = 0; i < 10; i++) queue.add(`distinct claim number ${i}`, "low", i * 100);
    await queue.drain();
    expect(peak).toBeLessThanOrEqual(5);
    expect(verify).toHaveBeenCalledTimes(10);
  });

  it("verifies waiting high-priority claims before low-priority ones", async () => {
    const order: string[] = [];
    const { queue } = makeQueue(async (_id, text) => {
      order.push(text);
    }, 1);
    queue.add("first low", "low", 1000);
    queue.add("second low", "low", 1100);
    queue.add("the high one", "high", 1200);
    await queue.drain();
    expect(order).toEqual(["first low", "the high one", "second low"]);
  });

  it("reports an error when verification throws", async () => {
    const { queue, errors } = makeQueue(async () => {
      throw new Error("network down");
    });
    queue.add("some claim", "low", 1000);
    await queue.drain();
    expect(errors).toHaveLength(1);
  });
});
