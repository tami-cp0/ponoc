"use client";

import { useCallback, useRef, useState } from "react";
import type { Card, ServerEvent, Verdict } from "../types";

export type { Card, CardStatus } from "../types";

export type Status = "idle" | "listening" | "reconnecting" | "stopped";

const TARGET_RATE = 16000;

export function useSession() {
  const [cards, setCards] = useState<Card[]>([]);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  const applyEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case "transcript":
        setTranscript(event.text);
        break;
      case "claim:spawned":
        setCards((prev) => [
          { id: event.claim.id, claim: event.claim.text, status: "verifying", backgrounded: false },
          ...prev,
        ]);
        break;
      case "claim:verdict":
        setCards((prev) => resolve(prev, event.id, event.result));
        break;
      case "claim:error":
        setCards((prev) =>
          prev.map((c) => (c.id === event.id ? { ...c, status: "error", reasoning: event.message } : c)),
        );
        break;
      case "status":
        setStatus(event.state);
        break;
    }
  }, []);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const socket = new WebSocket(`ws://${location.host}/ws`);
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;
    socket.onmessage = (e) => applyEvent(JSON.parse(e.data) as ServerEvent);
    socket.onclose = () => setStatus("stopped");
    await new Promise<void>((r) => (socket.onopen = () => r()));
    console.log("[client] WebSocket connected to /ws");

    const context = new AudioContext();
    contextRef.current = context;
    await context.audioWorklet.addModule("/pcm-worklet.js");

    const source = context.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(context, "pcm-worklet", {
      processorOptions: { targetRate: TARGET_RATE },
    });
    worklet.port.onmessage = (e) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(e.data);
    };
    source.connect(worklet);
  }, [applyEvent]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    contextRef.current?.close();
    socketRef.current?.close();
    streamRef.current = null;
    contextRef.current = null;
    socketRef.current = null;
    setStatus("stopped");
  }, []);

  const dismiss = useCallback((id: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, backgrounded: true } : c)));
  }, []);

  const restore = useCallback((id: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, backgrounded: false } : c)));
  }, []);

  return { cards, transcript, status, start, stop, dismiss, restore };
}

function resolve(cards: Card[], id: string, result: Verdict): Card[] {
  return cards.map((c) =>
    c.id === id
      ? { ...c, status: result.verdict ? "true" : "false", reasoning: result.reasoning, sources: result.sources }
      : c,
  );
}
