// Allows one use per key per window. In memory, so it resets on restart.
export class Cooldown {
  private readonly lastUsed = new Map<string, number>();

  constructor(private readonly windowMs: number) {}

  // Returns 0 and records the use if allowed, else the seconds left to wait.
  take(key: string, now = Date.now()): number {
    for (const [k, at] of this.lastUsed) {
      if (now - at >= this.windowMs) this.lastUsed.delete(k);
    }

    const last = this.lastUsed.get(key);
    if (last !== undefined) return Math.ceil((last + this.windowMs - now) / 1000);

    this.lastUsed.set(key, now);
    return 0;
  }
}
