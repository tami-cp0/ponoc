import { DeepgramClient } from "@deepgram/sdk";
import { config } from "../config";

interface RelayHandlers {
  onTranscript: (text: string, final: boolean) => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

type Socket = Awaited<ReturnType<DeepgramClient["listen"]["v1"]["connect"]>>;

export class DeepgramRelay {
  private socket: Socket | null = null;
  private closed = false;

  constructor(private readonly handlers: RelayHandlers) {}

  async start(): Promise<void> {
    const deepgram = new DeepgramClient({ apiKey: config.deepgramApiKey });

    const socket = await deepgram.listen.v1.connect({
      model: config.stt.model,
      language: config.stt.language,
      encoding: config.stt.encoding,
      sample_rate: config.stt.sampleRate,
      endpointing: config.stt.endpointing,
      smart_format: "true",
      punctuate: "true",
      interim_results: "true",
    });

    socket.on("message", (message) => {
      if (message.type !== "Results") return;
      const transcript = message.channel?.alternatives?.[0]?.transcript;
      if (!transcript) return;
      this.handlers.onTranscript(transcript, message.is_final ?? false);
    });

    socket.on("close", () => {
      if (!this.closed) this.handlers.onClose();
    });

    socket.on("error", (error) => this.handlers.onError(error));

    socket.connect();
    await socket.waitForOpen();
    this.socket = socket;
  }

  send(audio: ArrayBufferView): void {
    this.socket?.sendMedia(audio);
  }

  stop(): void {
    this.closed = true;
    this.socket?.close();
    this.socket = null;
  }
}
