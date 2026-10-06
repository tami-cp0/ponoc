export type CardStatus = "verifying" | "true" | "false";

export interface Card {
  id: string;
  claim: string;
  status: CardStatus;
  reasoning?: string;
  sources?: string[];
}

export interface Verdict {
  verdict: boolean;
  reasoning: string;
  sources?: string[];
}

export type LiveStatus = "listening" | "stopped";

export type ServerEvent =
  | { type: "claim:spawned"; id: string; text: string }
  | { type: "claim:verdict"; id: string; result: Verdict }
  | { type: "status"; state: LiveStatus }
  // Credits left, updated while listening.
  | { type: "credits"; balance: number };

// Sent as text; audio goes as binary frames.
export type ClientEvent = { type: "stop" };

export const CLOSE_UNAUTHORIZED = 4401;
export const CLOSE_OUT_OF_CREDITS = 4402;
export const CLOSE_REPLACED = 4409;
