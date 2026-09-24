"use client";

import { useCallback, useRef, useState } from "react";
import type { Card, ServerEvent, TokenUsage, Verdict } from "../types";

export type { Card, CardStatus } from "../types";
export type { TokenUsage } from "../types";

export type Status = "idle" | "listening" | "reconnecting" | "stopped";

const NO_USAGE: TokenUsage = { input: 0, output: 0, total: 0 };

const TARGET_RATE = 16000;

export function useSession() {
  const [cards, setCards] = useState<Card[]>([]);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  // Running token spend for the session, driven by the server's usage events.
  const [usage, setUsage] = useState<TokenUsage>(NO_USAGE);

  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  // Analyser the visualizer polls every animation frame. Held in a ref (not
  // state) so reading it doesn't trigger React renders.
  const analyserRef = useRef<AnalyserNode | null>(null);

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
      case "usage":
        // session is the server's authoritative running total, so replace
        // rather than accumulate.
        setUsage(event.session);
        break;
      case "status":
        setStatus(event.state);
        break;
    }
  }, []);

  const start = useCallback(async () => {
    setUsage(NO_USAGE); // fresh session starts the meter at zero
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

    // Tap the same mic source into an analyser for the visualizer. Parallel to
    // the worklet and not connected to the destination, so it observes the audio
    // without latency or feedback and needs no second mic permission.
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.85;
    // The STT stream has auto-gain on, so the voice is fairly hot. Widen the dB
    // window (default is -100..-30) so normal speech maps to the mid range and
    // only loud speech nears the top, instead of pegging the bars.
    analyser.minDecibels = -85;
    analyser.maxDecibels = -10;
    source.connect(analyser);
    analyserRef.current = analyser;

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
    analyserRef.current = null;
    setStatus("stopped");
  }, []);

  // Live analyser accessor for the visualizer. Returns null when no session is
  // running, so the visualizer can fall back to its idle (all-equal) state.
  const getAnalyser = useCallback(() => analyserRef.current, []);

  const dismiss = useCallback((id: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, backgrounded: true } : c)));
  }, []);

  const restore = useCallback((id: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, backgrounded: false } : c)));
  }, []);

  return { cards, transcript, status, usage, start, stop, dismiss, restore, getAnalyser };
}

function resolve(cards: Card[], id: string, result: Verdict): Card[] {
  return cards.map((c) =>
    c.id === id
      ? { ...c, status: result.verdict ? "true" : "false", reasoning: result.reasoning, sources: result.sources }
      : c,
  );
}
