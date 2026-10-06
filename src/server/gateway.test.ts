import { createServer, request, type Server } from "node:http";
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
  claimsUnsure: 0,
  claimsError: 0,
  costMicros: 0,
  creditsMicros: 0,
};

class FakeSession implements LiveSession {
  audioBytes = 0;
  closed = false;
  // Stands in for verdicts still being worked on when the session closes.
  draining: (() => Promise<void>) | null = null;
  constructor(readonly send: (event: ServerEvent) => void) {}
  async start() {}
  audio(chunk: Buffer) {
    this.audioBytes += chunk.byteLength;
  }
  async close() {
    this.closed = true;
    await this.draining?.();
  }
  // Each audio byte costs one micro-credit, so tests can spend credits by sending audio.
  usage(): UsageSnapshot {
    return { ...EMPTY_USAGE, audioSeconds: this.audioBytes, creditsMicros: this.audioBytes };
  }
}

// Cookie header "user=<id>" stands in for a real session cookie. "user=down"
// simulates the database being unreachable; "user=slow" a slow lookup.
async function fakeGetUser(headers: Headers): Promise<SignedInUser | null> {
  const id = headers.get("cookie")?.replace("user=", "");
  if (id === "down") throw new Error("database unreachable");
  if (id === "slow") await new Promise((resolve) => setTimeout(resolve, 200));
  return id ? { id, name: id, email: `${id}@test` } : null;
}

let server: Server;
let gateway: Gateway;
let url: string;
let sessions: FakeSession[];
let saved: { recordId: string; usage: UsageSnapshot }[];
let finished: { userId: string; ranOut: boolean }[];
// Balance in micro-credits per user; anyone not listed has plenty.
let balances: Record<string, number>;

let nextRecord: number;

// Like the database: each session has its own record, and a user's balance has
// every record's latest saved spending taken off.
function charged(recordId: string): number {
  return saved.findLast((s) => s.recordId === recordId)?.usage.creditsMicros ?? 0;
}

function balanceOf(userId: string): number {
  const records = new Set(saved.map((s) => s.recordId).filter((id) => id.startsWith(`record-${userId}-`)));
  return (balances[userId] ?? 1_000_000) - [...records].reduce((sum, id) => sum + charged(id), 0);
}

async function start() {
  sessions = [];
  saved = [];
  finished = [];
  nextRecord = 0;
  balances = balances ?? {};
  gateway = createGateway({
    siteUrl: SITE,
    getUser: fakeGetUser,
    getBalance: async (userId) => balanceOf(userId),
    createSession: (send) => {
      const session = new FakeSession(send);
      sessions.push(session);
      return session;
    },
    usageStore: {
      create: async (userId) => `record-${userId}-${++nextRecord}`,
      save: async (recordId, usage) => {
        saved.push({ recordId, usage });
      },
      finish: async (recordId, userId, usage, ranOut) => {
        saved.push({ recordId, usage });
        finished.push({ userId, ranOut });
      },
      read: async (recordId) => ({
        balanceMicros: balanceOf(recordId.split("-")[1]),
        chargedMicros: charged(recordId),
      }),
    },
    balanceRefreshMs: 20,
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

  it("survives a client that disconnects during the sign-in check", async () => {
    await start();
    const req = request(url.replace("ws:", "http:"), {
      headers: {
        connection: "Upgrade",
        upgrade: "websocket",
        origin: SITE,
        cookie: "user=slow",
        "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
        "sec-websocket-version": "13",
      },
    });
    req.on("error", () => {});
    req.on("socket", (socket) => setTimeout(() => socket.resetAndDestroy(), 50));
    req.end();
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(sessions).toHaveLength(0);
    const ws = connect({ user: "a" });
    await opened(ws);
    ws.close();
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

  it("reports who is listening", async () => {
    await start();
    const a = connect({ user: "a" });
    const b = connect({ user: "b" });
    await Promise.all([opened(a), opened(b)]);
    expect(gateway.listening().sort()).toEqual(["a", "b"]);
    a.close();
    await closeCode(a);
    await new Promise((r) => setTimeout(r, 20));
    expect(gateway.listening()).toEqual(["b"]);
    b.close();
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
    expect(finished).toEqual([{ userId: "a", ranOut: false }]);
    expect(saved.at(-1)).toEqual({
      recordId: "record-a-1",
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

  it("on Stop, delivers verdicts still verifying before hanging up", async () => {
    await start();
    const ws = connect({ user: "a" });
    await opened(ws);
    const received = messages(ws);
    const closed = closeCode(ws);
    sessions[0].draining = async () => {
      sessions[0].send({ type: "status", state: "stopped" });
      await new Promise((r) => setTimeout(r, 30));
      sessions[0].send({ type: "claim:verdict", id: "c1", result: { verdict: true, reasoning: "Yes." } });
    };

    ws.send(JSON.stringify({ type: "stop" }));
    expect(await closed).toBe(1000);
    expect(received.at(-1)).toEqual({ type: "claim:verdict", id: "c1", result: { verdict: true, reasoning: "Yes." } });
  });

  it("doesn't let a new Start cut off a stopped session's verdicts", async () => {
    await start();
    const first = connect({ user: "a" });
    await opened(first);
    const firstClosed = closeCode(first);
    sessions[0].draining = () => new Promise((r) => setTimeout(r, 50));
    first.send(JSON.stringify({ type: "stop" }));
    await new Promise((r) => setTimeout(r, 10));

    const second = connect({ user: "a" });
    await opened(second);
    expect(gateway.listening()).toEqual(["a"]);
    expect(await firstClosed).toBe(1000);
    second.close();
  });

  it("closes with 4402 when the user has no credits", async () => {
    balances = { a: 0 };
    await start();
    const code = await closeCode(connect({ user: "a" }));
    expect(code).toBe(CLOSE_OUT_OF_CREDITS);
    expect(sessions).toHaveLength(0);
  });

  it("counts a replaced session's unsaved spending against the new one", async () => {
    balances = { a: 1000 };
    await start();
    const first = connect({ user: "a" });
    await opened(first);
    first.send(Buffer.alloc(800));
    await new Promise((r) => setTimeout(r, 50));

    const second = connect({ user: "a" });
    await opened(second);
    const closed = closeCode(second);
    second.send(Buffer.alloc(300));
    expect(await closed).toBe(CLOSE_OUT_OF_CREDITS);
  });

  it("picks up credits added during a session", async () => {
    balances = { a: 100 };
    await start();
    const ws = connect({ user: "a" });
    await opened(ws);
    balances.a = 1000;
    await new Promise((r) => setTimeout(r, 100));
    ws.send(Buffer.alloc(300));
    await new Promise((r) => setTimeout(r, 1300));
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it("stops with 4402 when credits are taken away during a session", async () => {
    balances = { a: 1000 };
    await start();
    const ws = connect({ user: "a" });
    await opened(ws);
    const closed = closeCode(ws);
    balances.a = 0;
    expect(await closed).toBe(CLOSE_OUT_OF_CREDITS);
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
    await gateway.shutdown();
    expect(finished).toEqual([{ userId: "a", ranOut: true }]);
  });
});
