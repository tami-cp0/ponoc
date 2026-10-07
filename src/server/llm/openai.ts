import OpenAI from "openai";
import { cleanUrl } from "@/shared/url";
import { env } from "../env";
import type { CallUsage } from "../usage/UsageMeter";
import type { ModelRole } from "../usage/pricing";
import type { LLMProvider, TriageResult, VerifyResult } from "./provider";
import { MAX_FINDING_WORDS, isTooLong, pickSources, splitCitations } from "./finding";
import { TRIAGE_INSTRUCTIONS, TRIAGE_SCHEMA, VERIFY_INSTRUCTIONS, VERIFY_SCHEMA } from "./prompts";

interface OutputItem {
  type: string;
  action?: { sources?: { url?: string }[] };
  content?: { annotations?: { type: string; url?: string }[] }[];
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

    const usage = readUsage("triage", response);
    const parsed = readJson(response.output_text);
    if (!parsed) return { claim: null, priority: "low", usage };
    return {
      claim: parsed.is_checkable_now ? parsed.canonical_claim : null,
      priority: parsed.priority,
      usage,
    };
  }

  async verify(claim: string): Promise<VerifyResult> {
    const response = await this.client.responses.create({
      model: env.verifyModel,
      instructions: `Today is ${new Date().toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" })}.\n\n${VERIFY_INSTRUCTIONS}`,
      input: claim,
      tools: [{ type: "web_search" }],
      // Without this the model answers common-knowledge claims from memory,
      // and a verdict with no search has no source to show.
      tool_choice: "required",
      reasoning: { effort: "low" },
      include: ["web_search_call.action.sources"],
      text: { format: { type: "json_schema", name: "verdict", schema: VERIFY_SCHEMA, strict: true } },
    });

    const usage = readUsage("verify", response);
    const parsed = readJson(response.output_text);
    if (!parsed) return { verdict: null, usage };

    const finding = splitCitations(parsed.finding);
    const sources = pickSources([...parsed.sources, ...finding.sources], collectSources(response));
    // Logged so the prompt can be tightened.
    if (isTooLong(finding.text)) {
      console.warn(`finding over ${MAX_FINDING_WORDS} words: ${finding.text}`);
    }

    const verdict = parsed.verdict === "unsure" ? null : parsed.verdict === "true";
    return {
      verdict: { verdict, reasoning: finding.text, ...(sources.length ? { sources } : {}) },
      usage,
    };
  }
}

// The call is paid for even when its reply can't be read (e.g. cut off), so
// callers still bill the usage.
function readJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
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

// Pages the search returned: inline url_citation annotations first (what the
// model actually leaned on), then the search call's result list.
function collectSources(response: ResponseLike): string[] {
  const urls = new Set<string>();
  for (const item of outputItems(response)) {
    for (const part of item.content ?? []) {
      for (const note of part.annotations ?? []) {
        if (note.type === "url_citation" && note.url) urls.add(cleanUrl(note.url));
      }
    }
  }
  for (const item of outputItems(response)) {
    for (const source of item.action?.sources ?? []) {
      if (source.url) urls.add(cleanUrl(source.url));
    }
  }
  return [...urls];
}
