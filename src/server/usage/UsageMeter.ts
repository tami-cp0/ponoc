import { costUsd, creditsFor, toMicros, type ModelRole, type Prices, type TokenCount } from "./pricing";

// 16 kHz, 16-bit (2 bytes), mono.
const AUDIO_BYTES_PER_SECOND = 32_000;

export interface CallUsage {
  role: ModelRole;
  input: number;
  output: number;
  webSearches: number;
}

export interface UsageSnapshot {
  audioSeconds: number;
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
  claimsTrue: number;
  claimsFalse: number;
  claimsError: number;
  costMicros: number;
  creditsMicros: number;
}

export class UsageMeter {
  private audioBytes = 0;
  private webSearches = 0;
  private claimsTrue = 0;
  private claimsFalse = 0;
  private claimsError = 0;
  private readonly triage: TokenCount = { input: 0, output: 0 };
  private readonly verify: TokenCount = { input: 0, output: 0 };

  constructor(private readonly prices: Prices) {}

  addAudio(bytes: number): void {
    this.audioBytes += bytes;
  }

  addCall(call: CallUsage): void {
    const tokens = call.role === "triage" ? this.triage : this.verify;
    tokens.input += call.input;
    tokens.output += call.output;
    this.webSearches += call.webSearches;
  }

  addVerdict(isTrue: boolean): void {
    if (isTrue) this.claimsTrue++;
    else this.claimsFalse++;
  }

  addError(): void {
    this.claimsError++;
  }

  snapshot(): UsageSnapshot {
    const audioSeconds = this.audioBytes / AUDIO_BYTES_PER_SECOND;
    const cost = costUsd(
      { audioSeconds, webSearches: this.webSearches, triage: this.triage, verify: this.verify },
      this.prices,
    );

    return {
      audioSeconds: Math.round(audioSeconds),
      inputTokens: this.triage.input + this.verify.input,
      outputTokens: this.triage.output + this.verify.output,
      webSearches: this.webSearches,
      claimsTrue: this.claimsTrue,
      claimsFalse: this.claimsFalse,
      claimsError: this.claimsError,
      costMicros: toMicros(cost),
      creditsMicros: toMicros(creditsFor(cost)),
    };
  }
}
