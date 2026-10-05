import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { fromNodeHeaders } from "better-auth/node";
import { WebSocketServer, type WebSocket } from "ws";
import { CLOSE_OUT_OF_CREDITS, CLOSE_REPLACED, CLOSE_UNAUTHORIZED, type ServerEvent } from "@/shared/protocol";
import type { SignedInUser } from "./auth";
import type { UsageSnapshot } from "./usage/UsageMeter";

export interface LiveSession {
  start(): Promise<void>;
  audio(chunk: Buffer): void;
  close(): Promise<void>;
  usage(): UsageSnapshot;
}

export interface GatewayOptions {
  siteUrl: string;
  getUser: (headers: Headers) => Promise<SignedInUser | null>;
  // In millionths of a credit.
  getBalance: (userId: string) => Promise<number>;
  createSession: (send: (event: ServerEvent) => void) => LiveSession;
  usageStore: {
    create: (userId: string) => Promise<string>;
    save: (recordId: string, usage: UsageSnapshot) => Promise<void>;
    // The final save, once the session has ended.
    finish: (recordId: string, userId: string, usage: UsageSnapshot, ranOut: boolean) => Promise<void>;
    // The current balance and what this session has been charged, read together.
    read: (recordId: string) => Promise<{ balanceMicros: number; chargedMicros: number } | null>;
  };
  flushIntervalMs?: number;
  balanceRefreshMs?: number;
}

export interface Gateway {
  handleUpgrade: (req: IncomingMessage, socket: Duplex, head: Buffer) => void;
  shutdown: () => Promise<void>;
}

const CLOSE_GOING_AWAY = 1001;
const CLOSE_SERVER_ERROR = 1011;
const BUDGET_CHECK_MS = 1000;
const FLUSH_INTERVAL_MS = 60_000;
const BALANCE_REFRESH_MS = 5000;
const TERMINATE_AFTER_MS = 2000;

function ignoreSocketError(): void {}

export function createGateway(options: GatewayOptions): Gateway {
  const wss = new WebSocketServer({ noServer: true });
  const allowedOrigin = new URL(options.siteUrl).origin;
  const liveByUser = new Map<string, { ws: WebSocket; flush: () => Promise<void> }>();
  const running = new Set<Promise<void>>();

  // Browsers always send Origin on WebSocket handshakes. Checking it stops other
  // sites from opening a socket that rides on the user's cookie.
  async function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
    // Until ws takes the socket over, nothing else listens for its errors, and an
    // unhandled one (the client leaving mid-lookup) would crash the process.
    socket.on("error", ignoreSocketError);

    if (req.headers.origin !== allowedOrigin) {
      socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
      return;
    }

    const headers = fromNodeHeaders(req.headers);
    // A failed lookup (e.g. the database is unreachable) is a server error, not a
    // sign-out: treating it as 4401 would send a signed-in user to /login.
    let user: SignedInUser | null = null;
    let balance = 0;
    let lookupFailed = false;
    try {
      user = await options.getUser(headers);
      if (user) {
        // This connection will replace any live one; save what that one has spent
        // so far, or the balance below wouldn't count it.
        await liveByUser.get(user.id)?.flush();
        balance = await options.getBalance(user.id);
      }
    } catch {
      lookupFailed = true;
    }

    socket.off("error", ignoreSocketError);
    // Accept even when refusing, so the client can read the close code.
    wss.handleUpgrade(req, socket, head, (ws) => {
      if (lookupFailed) ws.close(CLOSE_SERVER_ERROR, "try again");
      else if (!user) ws.close(CLOSE_UNAUTHORIZED, "unauthorized");
      else if (balance <= 0) ws.close(CLOSE_OUT_OF_CREDITS, "out of credits");
      else run(ws, user, headers, balance);
    });
  }

  function run(ws: WebSocket, user: SignedInUser, headers: Headers, balance: number): void {
    liveByUser.get(user.id)?.ws.close(CLOSE_REPLACED, "replaced");

    const send = (event: ServerEvent) => {
      if (ws.readyState !== ws.OPEN) return;
      ws.send(JSON.stringify(event));
      // The session ended itself (e.g. speech-to-text dropped): hang up.
      if (event.type === "status" && event.state === "stopped") ws.close(1000, "session ended");
    };
    const session = options.createSession(send);
    const recordId = options.usageStore.create(user.id);

    const flush = () =>
      recordId
        .then((id) => options.usageStore.save(id, session.usage()))
        .catch((err: Error) => console.error("usage save failed:", err.message));
    liveByUser.set(user.id, { ws, flush });

    // Also re-checks the sign-in: signing in on another device deletes this one's
    // auth session, and the live session should stop with it.
    const timer = setInterval(async () => {
      await flush();
      const stillSignedIn = await options.getUser(headers).catch(() => user);
      if (!stillSignedIn) ws.close(CLOSE_UNAUTHORIZED, "signed out");
    }, options.flushIntervalMs ?? FLUSH_INTERVAL_MS);

    // The balance as last read, and how much of this session it already had taken
    // off. Re-read so credits added or removed mid-session count straight away.
    let available = balance;
    let charged = 0;
    const refresh = setInterval(() => {
      recordId
        .then((id) => options.usageStore.read(id))
        .then((read) => {
          if (!read) return;
          available = read.balanceMicros;
          charged = read.chargedMicros;
        })
        .catch((err: Error) => console.error("balance read failed:", err.message));
    }, options.balanceRefreshMs ?? BALANCE_REFRESH_MS);

    // Keeps the client's balance current and stops the session when it hits zero.
    let lastSentBalance = -1;
    let ranOut = false;
    const budget = setInterval(() => {
      const remaining = available - (session.usage().creditsMicros - charged);
      const shown = Math.round(Math.max(0, remaining) / 10_000) / 100;
      if (shown !== lastSentBalance) {
        lastSentBalance = shown;
        send({ type: "credits", balance: shown });
      }
      if (remaining <= 0) {
        ranOut = true;
        ws.close(CLOSE_OUT_OF_CREDITS, "out of credits");
      }
    }, BUDGET_CHECK_MS);

    session.start().catch((err: Error) => {
      console.error("session failed to start:", err.message);
      send({ type: "status", state: "stopped" });
      ws.close();
    });

    ws.on("message", (data, isBinary) => {
      if (isBinary) session.audio(data as Buffer);
    });

    const finished = new Promise<void>((resolve) => {
      let ended = false;
      const end = () => {
        if (ended) return;
        ended = true;
        clearInterval(timer);
        clearInterval(refresh);
        clearInterval(budget);
        if (liveByUser.get(user.id)?.ws === ws) liveByUser.delete(user.id);
        const finish = () =>
          recordId
            .then((id) => options.usageStore.finish(id, user.id, session.usage(), ranOut))
            .catch((err: Error) => console.error("usage save failed:", err.message));
        session.close().then(finish).finally(resolve);
      };
      ws.on("close", end);
      ws.on("error", end);
    });
    running.add(finished);
    finished.finally(() => running.delete(finished));
  }

  // Waits for every session to finish verifying and save its usage.
  async function shutdown(): Promise<void> {
    for (const ws of wss.clients) {
      ws.close(CLOSE_GOING_AWAY, "server restarting");
      setTimeout(() => ws.terminate(), TERMINATE_AFTER_MS).unref();
    }
    await Promise.all([...running]);
    wss.close();
  }

  return {
    handleUpgrade: (req, socket, head) => void handleUpgrade(req, socket, head),
    shutdown,
  };
}
