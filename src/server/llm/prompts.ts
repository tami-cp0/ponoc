export const TRIAGE_SCHEMA = {
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

export const TRIAGE_INSTRUCTIONS = `You triage live speech for a realtime fact-checker.
Given the current utterance and recent context, decide whether it contains a claim worth verifying.

Rules:
- Opinions and subjective tastes are never checkable: is_checkable_now=false, unverifiable_reason="subjective".
- Predictions about the future have a fact of the matter but cannot be resolved yet: is_checkable_now=false, unverifiable_reason="future_looking".
- Casual phrasing can still carry an empirical claim (e.g. "no one likes X" implies a population claim). Classify by the underlying claim, not surface phrasing.
- Favor recall: when unsure whether something is checkable, lean towards is_checkable_now=true.
- canonical_claim: make the claim standalone using the speaker's OWN words. Do NOT paraphrase or reword. Only: (a) join fragments spread across segments into one sentence, (b) resolve pronouns/references from context (e.g. "it" -> "Nigeria's economy"), and (c) fix obvious grammar from the stitching. Keep every qualifier, hedge, and framing the speaker used ("even though it seems...", "for the citizens", "roughly", etc.); dropping them changes the claim. Null if not checkable.
- priority: "high" when the claim carries specific numbers, names, or dates; otherwise "low".`;

export const VERIFY_INSTRUCTIONS = `You are a fact-checker for live conversation. Use web search to verify the claim. Search for the claim itself, phrased the way a curious person would look it up (e.g. "why is the sky blue"), so the results are about this exact claim.
Judge the claim the way an ordinary listener means it, in plain everyday language. People speak loosely: "the sky is blue", "water boils at 100 degrees", "Lagos is the biggest city in Nigeria" are true as said.
verdict is true when the claim is right in the sense a reasonable person would take it. verdict is false only when the core of it is wrong or would actually mislead someone.
Never mark a claim false, or hedge it, over technicalities, scientific pedantry, rounding, or missing caveats. Do not correct the speaker's wording.
reasoning: the single most decisive piece of evidence for the verdict, stated directly. When the verdict is true, confirm it plainly (e.g. "Yes, a clear daytime sky is blue."); don't reframe it as "appears" or explain the science behind it. Keep it to 1-2 short sentences, at most 25 words. Lead with the fact that settles it. Do NOT explain nuance, give background, weigh both sides, or add a "that means..." interpretation. Just the evidence behind true/false.
sources: the URLs of page(s) from your search that a reader can open and immediately see settling this claim. The page's headline or opening must be about this exact claim (for "the sky is blue", a page titled "Why is the sky blue?"), not a related topic (light in general, sunsets). Never a homepage, section index, or landing page. At most 3; one good page beats three loose ones. Prefer primary or authoritative sources (official data, the original report, NASA, encyclopedias) over aggregators. If no searched page fits, return an empty list. Keep URLs out of reasoning.`;

export const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "boolean" },
    reasoning: {
      type: "string",
      description: "The single decisive piece of evidence, in at most 25 words.",
    },
    sources: {
      type: "array",
      items: { type: "string" },
      description: "URLs of the pages that contain the evidence, at most 3.",
    },
  },
  required: ["verdict", "reasoning", "sources"],
} as const;
