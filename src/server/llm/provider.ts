import type { Verdict } from "@/shared/protocol";
import type { CallUsage } from "../usage/UsageMeter";

export interface TriageResult {
  // The standalone claim to verify, or null when the utterance has nothing checkable.
  claim: string | null;
  priority: "high" | "low";
  usage: CallUsage;
}

export interface VerifyResult {
  verdict: Verdict;
  usage: CallUsage;
}

export interface LLMProvider {
  triage(utterance: string, context: string[]): Promise<TriageResult>;
  verify(claim: string): Promise<VerifyResult>;
}
