"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CLOSE_OUT_OF_CREDITS,
  CLOSE_REPLACED,
  CLOSE_UNAUTHORIZED,
  type Card,
  type LiveStatus,
  type ServerEvent,
  type Verdict,
} from "@/shared/protocol";
import { openMicrophone, type Microphone } from "./microphone";

export type Status = "idle" | "connecting" | LiveStatus;

// How long Stop shows pressed when the session stops itself.
const AUTO_STOP_PRESS_MS = 220;

const NOTICE = {
  micBlocked: "Microphone blocked. Allow it in your browser, then press Start.",
  noMic: "No microphone found.",
  replaced: "Listening moved to another tab or device.",
  lost: "Connection lost. Press Start to continue.",
  failed: "Couldn't start listening. Try again.",
  offline: "You're offline. Check your connection and try again.",
};

function failureNotice(listened: boolean): string {
  if (!navigator.onLine) return NOTICE.offline;
  return listened ? NOTICE.lost : NOTICE.failed;
}

function micNotice(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return NOTICE.micBlocked;
  if (name === "NotFoundError" || name === "OverconstrainedError") return NOTICE.noMic;
  return NOTICE.failed;
}

function socketUrl(): string {
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${location.host}/ws`;
}

export function useLiveSession(initialCredits: number) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [credits, setCredits] = useState(initialCredits);
  const [ranOut, setRanOut] = useState(false);
  const [stopping, setStopping] = useState(false);
  // Why a session stopped without the user pressing Stop, shown as a short notice.
  const [notice, setNotice] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const micRef = useRef<Microphone | null>(null);
  // Tells a failed start (never listened) from a dropped session.
  const listenedRef = useRef(false);

  const release = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const stop = useCallback(() => {
    release();
    setStatus("stopped");
  }, [release]);

  // Leaving the page (e.g. logging out) must turn the mic off and hang up.
  useEffect(() => release, [release]);

  const applyEvent = useCallback(
    (event: ServerEvent) => {
      switch (event.type) {
        case "claim:spawned":
          setCards((prev) => [{ id: event.id, claim: event.text, status: "verifying" }, ...prev]);
          break;
        case "claim:verdict":
          setCards((prev) => prev.map((c) => (c.id === event.id ? withVerdict(c, event.result) : c)));
          break;
        case "credits":
          setCredits(event.balance);
          break;
        case "status":
          if (event.state === "stopped") {
            stop();
            setNotice(failureNotice(listenedRef.current));
          } else {
            listenedRef.current = true;
            setStatus(event.state);
          }
          break;
      }
    },
    [stop],
  );

  const start = useCallback(async () => {
    if (!navigator.onLine) {
      setNotice(NOTICE.offline);
      return;
    }
    setStatus("connecting");
    setNotice(null);
    listenedRef.current = false;
    const socket = new WebSocket(socketUrl());
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;
    socket.onmessage = (e) => {
      // Ignore anything still in flight from a socket the user already stopped.
      if (socketRef.current === socket) applyEvent(JSON.parse(e.data));
    };
    socket.onclose = (e) => {
      if (socketRef.current !== socket) return;
      if (e.code === CLOSE_OUT_OF_CREDITS) {
        // The mic goes off now; Stop then visibly presses before the notice shows.
        release();
        setCredits(0);
        setStopping(true);
        setTimeout(() => {
          setStopping(false);
          setStatus("stopped");
          setRanOut(true);
        }, AUTO_STOP_PRESS_MS);
        return;
      }
      stop();
      if (e.code === CLOSE_UNAUTHORIZED) {
        router.push("/login");
      } else if (e.code === CLOSE_REPLACED) {
        setNotice(NOTICE.replaced);
      } else {
        setNotice(failureNotice(listenedRef.current));
      }
    };

    let mic: Microphone;
    try {
      mic = await openMicrophone((pcm) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(pcm);
      });
    } catch (err) {
      stop();
      setNotice(micNotice(err));
      return;
    }

    // The socket may have closed while the permission prompt was open.
    if (socketRef.current !== socket) mic.stop();
    else micRef.current = mic;
  }, [applyEvent, release, stop, router]);

  const getAnalyser = useCallback(() => micRef.current?.analyser ?? null, []);

  const dismissRanOut = useCallback(() => setRanOut(false), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  return { cards, status, stopping, credits, ranOut, notice, start, stop, dismissRanOut, dismissNotice, getAnalyser };
}

function withVerdict(card: Card, result: Verdict): Card {
  return {
    ...card,
    status: result.verdict ? "true" : "false",
    reasoning: result.reasoning,
    sources: result.sources,
  };
}
