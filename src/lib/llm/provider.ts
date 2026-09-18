import type { TriageResult, Verdict } from "../types";

export interface LLMProvider {
  triage(utterance: string, context: string[]): Promise<TriageResult>;
  verify(claim: string): Promise<Verdict>;
}
