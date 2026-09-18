import OpenAI from "openai";
import { config } from "../config";
import type { TriageResult, Verdict } from "../types";
import type { LLMProvider } from "./provider";

const TRIAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    claim_type: {
      type: "string",
      enum: ["factual", "generalization", "prediction", "opinion", "none"],
    },
    is_checkable_now: { type: "boolean" },
    unverifiable_reason: {
      type: ["string", "null"],
      enum: ["subjective", "future_looking", "insufficient_specificity", null],
    },
    canonical_claim: { type: ["string", "null"] },
    confidence: { type: "number" },
    priority: { type: "string", enum: ["high", "low"] },
  },
  required: [
    "claim_type",
    "is_checkable_now",
    "unverifiable_reason",
    "canonical_claim",
    "confidence",
    "priority",
  ],
} as const;

const TRIAGE_INSTRUCTIONS = `You triage live speech for a realtime fact-checker.
Given the current utterance and recent context, decide whether it contains a claim worth verifying.

Rules:
- Opinions and subjective tastes are never checkable: is_checkable_now=false, unverifiable_reason="subjective".
- Predictions about the future have a fact of the matter but cannot be resolved yet: is_checkable_now=false, unverifiable_reason="future_looking".
- Casual phrasing can still carry an empirical claim (e.g. "no one likes X" implies a population claim). Classify by the underlying claim, not surface phrasing.
- Favor recall: when unsure whether something is checkable, lean towards is_checkable_now=true.
- canonical_claim: a clear, standalone, verifiable restatement (resolve pronouns from context). Null if not checkable.
- priority: "high" when the claim carries specific numbers, names, or dates; otherwise "low".`;

const VERIFY_INSTRUCTIONS = `You are a fact-checker. Use web search to verify the claim.
Return a verdict of true or false and a concise one or two sentence reasoning grounded in what you found.
If the claim is broadly correct, verdict is true; if it is false or misleading, verdict is false.`;

const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "boolean" },
    reasoning: { type: "string" },
  },
  required: ["verdict", "reasoning"],
} as const;

export class OpenAIProvider implements LLMProvider {
  private _client: OpenAI | null = null;

  private get client(): OpenAI {
    if (!this._client) this._client = new OpenAI({ apiKey: config.openaiApiKey });
    return this._client;
  }

  async triage(utterance: string, context: string[]): Promise<TriageResult> {
    const input = context.length
      ? `Recent context:\n${context.join("\n")}\n\nCurrent utterance:\n${utterance}`
      : `Current utterance:\n${utterance}`;

    const response = await this.client.responses.create({
      model: config.triageModel,
      instructions: TRIAGE_INSTRUCTIONS,
      input,
      reasoning: { effort: "none" },
      text: {
        format: {
          type: "json_schema",
          name: "triage",
          schema: TRIAGE_SCHEMA,
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(response.output_text);
    return { utterance, ...parsed } as TriageResult;
  }

  async verify(claim: string): Promise<Verdict> {
    const response = await this.client.responses.create({
      model: config.verifyModel,
      instructions: VERIFY_INSTRUCTIONS,
      input: claim,
      tools: [{ type: "web_search" }],
      text: {
        format: {
          type: "json_schema",
          name: "verdict",
          schema: VERIFY_SCHEMA,
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(response.output_text);
    const sources = collectSources(response);
    return { ...parsed, ...(sources.length ? { sources } : {}) } as Verdict;
  }
}

function collectSources(response: { output?: unknown }): string[] {
  const urls = new Set<string>();
  const output = (response.output ?? []) as Array<Record<string, unknown>>;
  for (const item of output) {
    const action = item.action as { sources?: Array<{ url?: string }> } | undefined;
    for (const s of action?.sources ?? []) {
      if (s.url) urls.add(s.url);
    }
  }
  return [...urls];
}
