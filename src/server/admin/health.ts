import { sql } from "drizzle-orm";
import { db } from "../db";
import { env } from "../env";

export interface Check {
  ok: boolean;
  ms: number;
  detail?: string;
}

export interface Health {
  database: Check;
  openai: Check;
  deepgram: Check;
  uptimeSeconds: number;
  memoryMb: number;
  commit: string | null;
}

const PROVIDER_TIMEOUT_MS = 5000;
// Provider checks are cached so a dashboard refreshing every 30s doesn't hammer them.
const PROVIDER_CACHE_MS = 60_000;

async function timed(run: () => Promise<string | void>): Promise<Check> {
  const start = performance.now();
  try {
    const detail = await run();
    return { ok: true, ms: Math.round(performance.now() - start), ...(detail ? { detail } : {}) };
  } catch (err) {
    return { ok: false, ms: Math.round(performance.now() - start), detail: (err as Error).message };
  }
}

async function expectOk(url: string, authorization: string): Promise<void> {
  const res = await fetch(url, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (res.status === 401) throw new Error("API key rejected");
  // 403 means the key works but can't list this resource, which is fine here.
  if (!res.ok && res.status !== 403) throw new Error(`HTTP ${res.status}`);
}

let providers: { at: number; openai: Check; deepgram: Check } | null = null;

async function checkProviders(): Promise<{ openai: Check; deepgram: Check }> {
  if (providers && Date.now() - providers.at < PROVIDER_CACHE_MS) return providers;
  const [openai, deepgram] = await Promise.all([
    timed(() => expectOk("https://api.openai.com/v1/models", `Bearer ${env.openaiApiKey}`)),
    timed(() => expectOk("https://api.deepgram.com/v1/projects", `Token ${env.deepgramApiKey}`)),
  ]);
  providers = { at: Date.now(), openai, deepgram };
  return providers;
}

export async function getHealth(): Promise<Health> {
  const [database, { openai, deepgram }] = await Promise.all([
    timed(async () => {
      await db.execute(sql`select 1`);
    }),
    checkProviders(),
  ]);
  return {
    database,
    openai,
    deepgram,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1_048_576),
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };
}
