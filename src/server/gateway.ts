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
  };
  flushIntervalMs?: number;
}

export interface Gateway {
  handleUpgrade: (req: IncomingMessage, socket: Duplex, head: Buffer) => void;
  shutdown: () => Promise<void>;
}

const CLOSE_GOING_AWAY = 1001;
const CLOSE_SERVER_ERROR = 1011;
const BUDGET_CHECK_MS = 1000;
const FLUSH_INTERVAL_MS = 60_000;
const TERMINATE_AFTER_MS = 2000;

export function createGateway(options: GatewayOptions): Gateway {
  const wss = new WebSocketServer({ noServer: true });
  const allowedOrigin = new URL(options.siteUrl).origin;
  const liveByUser = new Map<string, WebSocket>();
  const running = new Set<Promise<void>>();

  // Browsers always send Origin on WebSocket handshakes. Checking it stops other
  // sites from opening a socket that rides on the user's cookie.
  async function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
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
      if (user) balance = await options.getBalance(user.id);
    } catch {
      lookupFailed = true;
    }

    // Accept even when refusing, so the client can read the close code.
    wss.handleUpgrade(req, socket, head, (ws) => {
      if (lookupFailed) ws.close(CLOSE_SERVER_ERROR, "try again");
      else if (!user) ws.close(CLOSE_UNAUTHORIZED, "unauthorized");
      else if (balance <= 0) ws.close(CLOSE_OUT_OF_CREDITS, "out of credits");
      else run(ws, user, headers, balance);
    });
  }

  function run(ws: WebSocket, user: SignedInUser, headers: Headers, balance: number): void {
    liveByUser.get(user.id)?.close(CLOSE_REPLACED, "replaced");
    liveByUser.set(user.id, ws);

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

    // Also re-checks the sign-in: signing in on another device deletes this one's
    // auth session, and the live session should stop with it.
    const timer = setInterval(async () => {
      await flush();
      const stillSignedIn = await options.getUser(headers).catch(() => user);
      if (!stillSignedIn) ws.close(CLOSE_UNAUTHORIZED, "signed out");
    }, options.flushIntervalMs ?? FLUSH_INTERVAL_MS);

    // Keeps the client's balance current and stops the session when it hits zero.
    let lastSentBalance = -1;
    const budget = setInterval(() => {
      const remaining = balance - session.usage().creditsMicros;
      const shown = Math.round(Math.max(0, remaining) / 10_000) / 100;
      if (shown !== lastSentBalance) {
        lastSentBalance = shown;
        send({ type: "credits", balance: shown });
      }
      if (remaining <= 0) ws.close(CLOSE_OUT_OF_CREDITS, "out of credits");
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
        clearInterval(budget);
        if (liveByUser.get(user.id) === ws) liveByUser.delete(user.id);
        session.close().then(flush).finally(resolve);
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
