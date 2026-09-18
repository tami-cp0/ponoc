export const config = {
  deepgramApiKey: process.env.DEEPGRAM_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",

  triageModel: process.env.TRIAGE_MODEL ?? "gpt-5.4-nano",
  verifyModel: process.env.VERIFY_MODEL ?? "gpt-5.4-mini",

  stt: {
    model: "nova-3",
    language: "en",
    encoding: "linear16",
    sampleRate: 16000,
    endpointing: 150,
  },

  segment: {
    pauseMs: 700,
    danglingWords: [
      "and", "or", "but", "because", "so", "which", "that", "who",
      "if", "when", "while", "as", "than", "to", "of", "for", "with",
    ],
  },

  triage: {
    windowSize: 3,
  },

  queue: {
    dedupWindowMs: 8000,
    dedupSimilarity: 0.85,
    maxConcurrentVerify: 3,
  },

  deck: {
    maxActiveCards: 10,
  },
} as const;
