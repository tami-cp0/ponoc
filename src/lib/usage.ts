import type { TokenUsage } from "./types";

const ZERO: TokenUsage = { input: 0, output: 0, total: 0 };

function add(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    total: a.total + b.total,
  };
}

// Tracks token spend across a session. A card's cost is the triage call that
// surfaced it plus the verify call that resolved it — but those happen at
// different times (triage up front, verify later in the queue), so the meter
// records each as it lands and reports the running session total plus the tokens
// that a given card cost.
export class UsageMeter {
  private session: TokenUsage = ZERO;

  // Fold a call's usage into the session total. Missing usage (e.g. a mocked
  // provider) counts as zero. Returns the call's own total for convenience.
  record(usage?: TokenUsage): number {
    if (!usage) return 0;
    this.session = add(this.session, usage);
    return usage.total;
  }

  get total(): TokenUsage {
    return this.session;
  }
}

// Sum of two calls' token totals — a card's generation cost (triage + verify).
export function cardTotal(triage?: TokenUsage, verify?: TokenUsage): number {
  return (triage?.total ?? 0) + (verify?.total ?? 0);
}
