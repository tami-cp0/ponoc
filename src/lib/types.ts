export type ClaimType =
  | "factual"
  | "generalization"
  | "prediction"
  | "opinion"
  | "none";

export type UnverifiableReason =
  | "subjective"
  | "future_looking"
  | "insufficient_specificity"
  | null;

export interface Utterance {
  text: string;
  speaker?: number;
  at: number;
}

// Token spend for one model call. total is authoritative — providers report it
// directly rather than us summing input + output (they can differ, e.g. cached
// or reasoning tokens).
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface TriageResult {
  utterance: string;
  claim_type: ClaimType;
  is_checkable_now: boolean;
  unverifiable_reason: UnverifiableReason;
  canonical_claim: string | null;
  confidence: number;
  priority: "high" | "low";
  usage?: TokenUsage;
}

export interface Verdict {
  verdict: boolean;
  reasoning: string;
  sources?: string[];
  usage?: TokenUsage;
}

export interface Claim {
  id: string;
  text: string;
  priority: "high" | "low";
  at: number;
}

export type ServerEvent =
  | { type: "transcript"; text: string; final: boolean }
  | { type: "claim:spawned"; claim: Claim }
  | { type: "claim:verdict"; id: string; result: Verdict }
  | { type: "claim:error"; id: string; message: string }
  // card: tokens spent generating a single card (its triage + verify calls).
  // session: running total across the whole session so far.
  | { type: "usage"; card: number; session: TokenUsage }
  | { type: "status"; state: "listening" | "reconnecting" | "stopped" };

export type CardStatus = "verifying" | "true" | "false" | "error";

export interface Card {
  id: string;
  claim: string;
  status: CardStatus;
  reasoning?: string;
  sources?: string[];
  backgrounded: boolean;
}
