import type { Prices } from "./usage/pricing";

// Read lazily: `next build` imports route modules that reach this file, and the
// build must not fail just because runtime secrets aren't present yet.
const REQUIRED = [
  "SITE_URL",
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "DEEPGRAM_API_KEY",
  "OPENAI_API_KEY",
  "TRIAGE_MODEL",
  "TRIAGE_INPUT_USD_PER_M",
  "TRIAGE_OUTPUT_USD_PER_M",
  "VERIFY_MODEL",
  "VERIFY_INPUT_USD_PER_M",
  "VERIFY_OUTPUT_USD_PER_M",
  "WEB_SEARCH_USD",
  "DEEPGRAM_USD_PER_MIN",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

const REQUIRED_IN_PRODUCTION = ["RESEND_API_KEY", "EMAIL_FROM"];

export function assertEnv(): void {
  const names = process.env.NODE_ENV === "production" ? [...REQUIRED, ...REQUIRED_IN_PRODUCTION] : REQUIRED;
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

function read(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function readPrice(name: string): number {
  const value = Number(read(name));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a price in USD, like 0.75 (got "${process.env[name]}")`);
  }
  return value;
}

export const env = {
  get siteUrl() {
    return read("SITE_URL");
  },
  get databaseUrl() {
    return read("DATABASE_URL");
  },
  get authSecret() {
    return read("BETTER_AUTH_SECRET");
  },
  get googleClientId() {
    return read("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return read("GOOGLE_CLIENT_SECRET");
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY ?? "";
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? "ponoc <login@ponoc.tech>";
  },
  get deepgramApiKey() {
    return read("DEEPGRAM_API_KEY");
  },
  get openaiApiKey() {
    return read("OPENAI_API_KEY");
  },
  get triageModel() {
    return read("TRIAGE_MODEL");
  },
  get verifyModel() {
    return read("VERIFY_MODEL");
  },
  get prices(): Prices {
    return {
      triage: { input: readPrice("TRIAGE_INPUT_USD_PER_M"), output: readPrice("TRIAGE_OUTPUT_USD_PER_M") },
      verify: { input: readPrice("VERIFY_INPUT_USD_PER_M"), output: readPrice("VERIFY_OUTPUT_USD_PER_M") },
      webSearch: readPrice("WEB_SEARCH_USD"),
      audioPerMinute: readPrice("DEEPGRAM_USD_PER_MIN"),
    };
  },
  get port() {
    return Number(process.env.PORT) || 3000;
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get stripeSecretKey() {
    return read("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return read("STRIPE_WEBHOOK_SECRET");
  },
};
