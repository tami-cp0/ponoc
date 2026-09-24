import OpenAI from "openai";
import { config } from "../config";
import type { TokenUsage, TriageResult, Verdict } from "../types";
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
- canonical_claim: make the claim standalone using the speaker's OWN words. Do NOT paraphrase or reword. Only: (a) join fragments spread across segments into one sentence, (b) resolve pronouns/references from context (e.g. "it" -> "Nigeria's economy"), and (c) fix obvious grammar from the stitching. Keep every qualifier, hedge, and framing the speaker used ("even though it seems...", "for the citizens", "roughly", etc.); dropping them changes the claim. Null if not checkable.
- priority: "high" when the claim carries specific numbers, names, or dates; otherwise "low".`;

const VERIFY_INSTRUCTIONS = `You are a fact-checker. Use web search to verify the claim.
If the claim is broadly correct, verdict is true; if it is false or misleading, verdict is false.
reasoning: the single most decisive piece of evidence for the verdict, stated directly. Keep it to 1-2 short sentences, at most ~40 words. Lead with the fact that settles it. Do NOT explain nuance, give background, weigh both sides, or add a "that means..." interpretation. Just the evidence behind true/false.
Cite the specific page(s) that directly contain the supporting evidence (the actual article, dataset, report, or statement), not a site homepage, section index, or generic landing page. Prefer primary sources (official data, the original report or statement) over aggregators.`;

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
    return { utterance, ...parsed, usage: readUsage(response) } as TriageResult;
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
    return { ...parsed, ...(sources.length ? { sources } : {}), usage: readUsage(response) } as Verdict;
  }
}

// Pull the token spend off a Responses API result. total is what the API bills,
// so we trust its total_tokens directly rather than re-adding the parts. Returns
// undefined if the field is absent (e.g. a mocked provider in tests).
function readUsage(response: {
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
}): TokenUsage | undefined {
  const u = response.usage;
  if (!u) return undefined;
  return {
    input: u.input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    total: u.total_tokens ?? 0,
  };
}

function collectSources(response: { output?: unknown }): string[] {
  const urls = new Set<string>();
  const output = (response.output ?? []) as Array<Record<string, unknown>>;
  for (const item of output) {
    const action = item.action as { sources?: Array<{ url?: string }> } | undefined;
    for (const s of action?.sources ?? []) {
      if (s.url) urls.add(cleanUrl(s.url));
    }
  }
  return [...urls];
}

// Strip tracking query params (e.g. the utm_source=openai the web-search tool
// appends) so cited URLs are clean. Leaves everything else untouched.
function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|ref_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw;
  }
}
