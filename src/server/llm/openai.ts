import OpenAI from "openai";
import { cleanUrl } from "@/shared/url";
import { env } from "../env";
import type { CallUsage } from "../usage/UsageMeter";
import type { ModelRole } from "../usage/pricing";
import type { LLMProvider, TriageResult, VerifyResult } from "./provider";
import { MAX_FINDING_WORDS, isTooLong, splitCitations } from "./finding";
import { TRIAGE_INSTRUCTIONS, TRIAGE_SCHEMA, VERIFY_INSTRUCTIONS, VERIFY_SCHEMA } from "./prompts";

interface OutputItem {
  type: string;
  action?: { sources?: { url?: string }[] };
}

interface ResponseLike {
  output_text: string;
  output?: unknown;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export class OpenAIProvider implements LLMProvider {
  private readonly client = new OpenAI({ apiKey: env.openaiApiKey });

  async triage(utterance: string, context: string[]): Promise<TriageResult> {
    const input = context.length
      ? `Recent context:\n${context.join("\n")}\n\nCurrent utterance:\n${utterance}`
      : `Current utterance:\n${utterance}`;

    const response = await this.client.responses.create({
      model: env.triageModel,
      instructions: TRIAGE_INSTRUCTIONS,
      input,
      reasoning: { effort: "none" },
      text: { format: { type: "json_schema", name: "triage", schema: TRIAGE_SCHEMA, strict: true } },
    });

    const parsed = JSON.parse(response.output_text);
    return {
      claim: parsed.is_checkable_now ? parsed.canonical_claim : null,
      priority: parsed.priority,
      usage: readUsage("triage", response),
    };
  }

  async verify(claim: string): Promise<VerifyResult> {
    const response = await this.client.responses.create({
      model: env.verifyModel,
      instructions: VERIFY_INSTRUCTIONS,
      input: claim,
      tools: [{ type: "web_search" }],
      text: { format: { type: "json_schema", name: "verdict", schema: VERIFY_SCHEMA, strict: true } },
    });

    const parsed = JSON.parse(response.output_text);
    const finding = splitCitations(parsed.reasoning);
    const sources = [...new Set([...collectSources(response), ...finding.sources])];
    // Logged so the prompt can be tightened.
    if (isTooLong(finding.text)) {
      console.warn(`finding over ${MAX_FINDING_WORDS} words: ${finding.text}`);
    }

    return {
      verdict: { verdict: parsed.verdict, reasoning: finding.text, ...(sources.length ? { sources } : {}) },
      usage: readUsage("verify", response),
    };
  }
}

function outputItems(response: ResponseLike): OutputItem[] {
  return (response.output ?? []) as OutputItem[];
}

// The search fee isn't part of the token counts; each web_search_call in the
// output is one billed search.
function readUsage(role: ModelRole, response: ResponseLike): CallUsage {
  return {
    role,
    input: response.usage?.input_tokens ?? 0,
    output: response.usage?.output_tokens ?? 0,
    webSearches: outputItems(response).filter((item) => item.type === "web_search_call").length,
  };
}

function collectSources(response: ResponseLike): string[] {
  const urls = new Set<string>();
  for (const item of outputItems(response)) {
    for (const source of item.action?.sources ?? []) {
      if (source.url) urls.add(cleanUrl(source.url));
    }
  }
  return [...urls];
}
