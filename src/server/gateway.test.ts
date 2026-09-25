import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { CLOSE_OUT_OF_CREDITS, CLOSE_REPLACED, CLOSE_UNAUTHORIZED, type ServerEvent } from "@/shared/protocol";
import { createGateway, type Gateway, type LiveSession } from "./gateway";
import type { SignedInUser } from "./auth";
import type { UsageSnapshot } from "./usage/UsageMeter";

const SITE = "http://ponoc.test";

const EMPTY_USAGE: UsageSnapshot = {
  audioSeconds: 0,
  inputTokens: 0,
  outputTokens: 0,
  webSearches: 0,
  claimsTrue: 0,
  claimsFalse: 0,
  claimsError: 0,
  costMicros: 0,
  creditsMicros: 0,
};

class FakeSession implements LiveSession {
  audioBytes = 0;
  closed = false;
  constructor(readonly send: (event: ServerEvent) => void) {}
  async start() {}
  audio(chunk: Buffer) {
    this.audioBytes += chunk.byteLength;
  }
  async close() {
    this.closed = true;
  }
  // Each audio byte costs one micro-credit, so tests can spend credits by sending audio.
  usage(): UsageSnapshot {
    return { ...EMPTY_USAGE, audioSeconds: this.audioBytes, creditsMicros: this.audioBytes };
  }
}

// Cookie header "user=<id>" stands in for a real session cookie. "user=down"
// simulates the database being unreachable.
async function fakeGetUser(headers: Headers): Promise<SignedInUser | null> {
  const id = headers.get("cookie")?.replace("user=", "");
  if (id === "down") throw new Error("database unreachable");
  return id ? { id, name: id, email: `${id}@test` } : null;
}

let server: Server;
let gateway: Gateway;
let url: string;
let sessions: FakeSession[];
let saved: { recordId: string; usage: UsageSnapshot }[];
// Balance in micro-credits per user; anyone not listed has plenty.
let balances: Record<string, number>;

async function start() {
  sessions = [];
  saved = [];
  balances = balances ?? {};
  gateway = createGateway({
    siteUrl: SITE,
    getUser: fakeGetUser,
    getBalance: async (userId) => balances[userId] ?? 1_000_000,
    createSession: (send) => {
      const session = new FakeSession(send);
      sessions.push(session);
      return session;
    },
    usageStore: {
      create: async (userId) => `record-${userId}`,
      save: async (recordId, usage) => {
        saved.push({ recordId, usage });
      },
    },
  });
  server = createServer();
  server.on("upgrade", gateway.handleUpgrade);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `ws://localhost:${(server.address() as AddressInfo).port}/ws`;
}

function connect(options: { origin?: string; user?: string }): WebSocket {
  return new WebSocket(url, {
    origin: options.origin ?? SITE,
    headers: options.user ? { cookie: `user=${options.user}` } : {},
  });
}

function closeCode(ws: WebSocket): Promise<number> {
  return new Promise((resolve) => ws.on("close", (code) => resolve(code)));
}

function opened(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => ws.on("open", () => resolve()));
}

function messages(ws: WebSocket): ServerEvent[] {
  const received: ServerEvent[] = [];
  ws.on("message", (data) => received.push(JSON.parse(data.toString())));
  return received;
}

afterEach(async () => {
  balances = {};
  await gateway.shutdown();
  await new Promise((resolve) => server.close(resolve));
});

describe("gateway", () => {
  it("rejects a connection from another origin", async () => {
    await start();
    const ws = connect({ origin: "https://evil.example", user: "a" });
    const status = await new Promise((resolve) =>
      ws.on("unexpected-response", (_req, res) => resolve(res.statusCode)),
    );
    expect(status).toBe(403);
    expect(sessions).toHaveLength(0);
  });

  it("closes with 4401 when not signed in", async () => {
    await start();
    const code = await closeCode(connect({}));
    expect(code).toBe(CLOSE_UNAUTHORIZED);
    expect(sessions).toHaveLength(0);
  });

  it("closes with 1011, not 4401, when the sign-in check itself fails", async () => {
    await start();
    const code = await closeCode(connect({ user: "down" }));
    expect(code).toBe(1011);
    expect(sessions).toHaveLength(0);
  });

  it("replaces a user's older connection with 4409", async () => {
    await start();
    const first = connect({ user: "a" });
    await opened(first);
    const firstClosed = closeCode(first);

    const second = connect({ user: "a" });
    await opened(second);

    expect(await firstClosed).toBe(CLOSE_REPLACED);
    second.close();
  });

  it("lets different users connect at the same time", async () => {
    await start();
    const a = connect({ user: "a" });
    const b = connect({ user: "b" });
    await Promise.all([opened(a), opened(b)]);
    expect(sessions).toHaveLength(2);
    a.close();
    b.close();
  });

  it("forwards audio and saves usage when the socket closes", async () => {
    await start();
    const ws = connect({ user: "a" });
    await opened(ws);
    ws.send(Buffer.alloc(100));
    ws.send(Buffer.alloc(50));
    await new Promise((r) => setTimeout(r, 50));
    ws.close();

    await gateway.shutdown();
    expect(sessions[0].closed).toBe(true);
    expect(saved.at(-1)).toEqual({
      recordId: "record-a",
      usage: { ...EMPTY_USAGE, audioSeconds: 150, creditsMicros: 150 },
    });
  });

  it("closes the socket when the session reports it has stopped", async () => {
    await start();
    const ws = connect({ user: "a" });
    await opened(ws);
    const closed = closeCode(ws);
    sessions[0].send({ type: "status", state: "stopped" });
    expect(await closed).toBe(1000);
  });

  it("closes with 4402 when the user has no credits", async () => {
    balances = { a: 0 };
    await start();
    const code = await closeCode(connect({ user: "a" }));
    expect(code).toBe(CLOSE_OUT_OF_CREDITS);
    expect(sessions).toHaveLength(0);
  });

  it("stops the session with 4402 once it spends the balance", async () => {
    balances = { a: 100 };
    await start();
    const ws = connect({ user: "a" });
    const received = messages(ws);
    await opened(ws);
    const closed = closeCode(ws);
    ws.send(Buffer.alloc(150));

    expect(await closed).toBe(CLOSE_OUT_OF_CREDITS);
    expect(received).toContainEqual({ type: "credits", balance: 0 });
  });
});
