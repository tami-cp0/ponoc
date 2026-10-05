import { DeepgramClient } from "@deepgram/sdk";
import { env } from "../env";

const CONNECT_TIMEOUT_MS = 10_000;

export interface TranscriberHandlers {
  onFinal: (text: string) => void;
  // The connection dropped mid-session. No retry: the session ends and the user
  // presses Start again.
  onDropped: () => void;
}

export class Transcriber {
  private sendAudio: (audio: Buffer) => boolean = () => false;
  private closeSocket: () => void = () => {};
  private opened = false;
  private ended = false;

  constructor(private readonly handlers: TranscriberHandlers) {}

  async start(): Promise<void> {
    const deepgram = new DeepgramClient({ apiKey: env.deepgramApiKey });
    const socket = await deepgram.listen.v1.connect({
      model: "nova-3",
      language: "en",
      encoding: "linear16",
      sample_rate: 16000,
      endpointing: 150,
      smart_format: "true",
      punctuate: "true",
      interim_results: "false",
      // The SDK would otherwise reconnect on its own.
      reconnectAttempts: 0,
    });

    socket.on("message", (message) => {
      if (message.type !== "Results" || !message.is_final) return;
      const text = message.channel?.alternatives?.[0]?.transcript;
      if (text) this.handlers.onFinal(text);
    });
    socket.on("close", (event) => this.onDrop(`close ${event.code} ${event.reason}`));
    socket.on("error", (err) => this.onDrop(`error ${err.message}`));

    this.closeSocket = () => socket.close();
    this.sendAudio = (audio) => {
      // The SDK throws if the socket isn't open; that audio is simply lost.
      try {
        socket.sendMedia(audio);
        return true;
      } catch {
        return false;
      }
    };

    socket.connect();
    await withTimeout(socket.waitForOpen(), CONNECT_TIMEOUT_MS, "Deepgram connection timed out");
    this.opened = true;
  }

  send(audio: Buffer): boolean {
    return this.sendAudio(audio);
  }

  stop(): void {
    this.ended = true;
    this.closeSocket();
  }

  private onDrop(cause: string): void {
    if (!this.opened || this.ended) return;
    this.ended = true;
    console.error("deepgram dropped:", cause);
    this.handlers.onDropped();
  }
}

function withTimeout(promise: Promise<unknown>, ms: number, message: string): Promise<unknown> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
