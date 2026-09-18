# Realtime Claim Validator ("pinto") — Design Spec

**Date:** 2026-09-08
**Status:** Approved, ready for implementation

## 1. Summary

A tool that listens to live human speech, detects checkable factual claims in
near-realtime, and returns a true/false verdict with reasoning for each. Text/UI
only — no audio output. Built on the six-layer pipeline from the PRD.

The product surface is a single page: a Start/Stop button and a spawning deck of
claim cards. No landing page.

## 2. Stack & runtime shape

- Next.js 16 + React 19 + Tailwind v4 (existing scaffold).
- A **custom Node server** (`server.ts`) owning both the Next request handler and
  a `ws` WebSocket server on the same HTTP port (the supported Next 16 pattern for
  attaching a WebSocket server).
- One WebSocket per session carries **both directions**: audio up, events down
  (transcript, claim spawned, claim verdict). Lower latency than a separate SSE
  channel — speed is the priority.
- LLM layers (3 triage, 5 verify) sit behind a thin `LLMProvider` interface with an
  OpenAI implementation. Swapping providers = one new file + config change. Model
  IDs are floating aliases in config, never dated snapshots.

```
Browser                              Custom Node server                 External
────────                             ──────────────────                 ────────
mic getUserMedia ──PCM──►  /ws  (per-session)
                                 ├─► [1] DeepgramRelay ───────────────►  Deepgram Nova-3
                                 │      final segments ◄───────────────────┘
                                 │           │
                                 │      [2] segment()
                                 │           │
                                 │      [3] triage() (OpenAI nano) ─────►  OpenAI
                                 │           │  (checkable only)
                                 │      [4] ClaimQueue (dedup + queue)
                                 │           │
                                 │      [5] verify() (OpenAI + web_search) ► OpenAI
                                 │           │
   claim card deck  ◄──events────┴─── [6] push
```

## 3. Server layers

Each layer is a small independently-testable unit. A `Session` orchestrator wires
them per connection.

**`server.ts`** — custom server: Next handler + `ws` server on one port. Each
browser connection creates a `Session`.

**`Session`** (`lib/session.ts`) — owns one user's pipeline: Deepgram connection,
cross-speaker sliding utterance window, claim queue, outbound event sender. Cleans
up on disconnect.

**Layer 1 — `DeepgramRelay`** (`lib/stt/`)
- Opens Deepgram Nova-3 streaming (`smart_format`, `punctuate`, `endpointing`,
  word timestamps). Forwards audio up; emits `partial` (live caption) and `final`
  (pipeline input) transcript events. Reconnect handling. Key server-side only.

**Layer 2 — `segment()`** (`lib/segment/`) — pure function
- Input: finalized Deepgram segments. Cuts on punctuation + pause; holds
  dangling-conjunction fragments one cycle. Emits claim-sized utterances. Only
  state is a one-cycle hold buffer. Thresholds in config.

**Layer 3 — `triage()`** (`lib/triage/`)
- Calls `LLMProvider.triage()` (OpenAI nano, Structured Outputs). Input: current
  utterance + cross-speaker sliding window of last N utterances (config N).
- **Recall-biased** (tolerate false positives). Output schema:
  ```
  { utterance, claim_type, is_checkable_now, unverifiable_reason,
    canonical_claim, confidence, priority }
  ```
- Only `is_checkable_now: true` proceeds. Predictions optionally logged, not verified.

**Layer 4 — `ClaimQueue`** (`lib/queue/`)
- Dedup: normalize text + match within a time window → merge repeats and
  mid-sentence self-corrections. Priority-ordered (Layer 3 `priority`), bounded
  concurrency (`MAX_CONCURRENT_VERIFY`). Emits `claim:spawned` immediately, then
  schedules verification.

**Layer 5 — `verify()`** (`lib/verify/`)
- Calls `LLMProvider.verify()` (OpenAI reasoning tier + built-in `web_search`).
  Returns `{ verdict: boolean, reasoning, sources? }`. Emits `claim:verdict`.
- **Not cancelled on dismiss** — keeps running so backgrounded cards fill in silently.

**Layer 6 — event push** — over the same WebSocket. Events: `transcript`,
`claim:spawned`, `claim:verdict`, each carrying a stable `claimId`.

## 4. Client & UI

Deliberately minimal — plain CSS, no animation deps. The UI will be redone; this is
a functional scaffold, not a polished design. One page.

- **`useAudioCapture`** — Start/Stop. On Start: `getUserMedia` → `AudioWorklet`
  downsamples to Deepgram PCM → chunks over WebSocket. On Stop: tear down.
- **`useSession`** — opens WebSocket, sends audio, reduces events into React state
  keyed by `claimId`. Single source of truth for the deck.
- **`ClaimDeck` + `ClaimCard`** — per-card state machine: `verifying` (spinner) →
  `true`/`false` (verdict + reasoning) or `error`. Card title = canonical claim.
  - New claim spawns **on top**; older undismissed cards stack beneath.
  - **Top 10** active; an 11th slides the oldest active card to a **background stack**.
  - **Dismiss** = X or tap off the cards → top card to background stack; its
    verification keeps running and fills in silently. Background stack is reviewable.
- **Live transcript strip** — partials greyed, finals solid. Secondary to the deck.

## 5. Data flow (one claim)

```
mic PCM ─ws─► DeepgramRelay ─► "final" ─► segment() ─► utterance
  ─► triage() ─► checkable? ─no─► drop (predictions logged)
                        └─yes─► ClaimQueue.dedup ─► new? ─► emit claim:spawned
                                                          └─► verify() ─► emit claim:verdict
```

## 6. Error handling (each contained, never kills the session)

- Deepgram drops → relay reconnects; transcript strip shows reconnecting.
- Triage fails/times out → utterance skipped + logged; no card.
- Verify fails → card resolves to `error` ("couldn't verify"), never a false verdict.
- Mic denied → inline message, Start disabled.
- WebSocket drops → client auto-reconnects; in-flight backgrounded verifications lost (acceptable v1).

## 7. Config (`lib/config.ts`, from env — nothing hardcoded)

- Models: `TRIAGE_MODEL`, `VERIFY_MODEL` (floating aliases).
- Layer 2: pause threshold, dangling-word list.
- Layer 3: sliding window size N.
- Layer 4: dedup similarity threshold, dedup time window, `MAX_CONCURRENT_VERIFY`.
- Keys (server-side only): `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`.
- `.env` and `.env.example` created; user sets values.

## 8. Testing

Deterministic core unit-tested (vitest) without audio/network:
- `segment()` — multi-claim segments, spanning claims, dangling conjunctions.
- `ClaimQueue` dedup — repeats, self-corrections, distinct claims, time-window edges.
- `LLMProvider` behind interface → triage/verify testable with a fake provider.
- Layers 1/5 (external I/O) verified manually against live services.

## 9. Dependencies added

`@deepgram/sdk`, `openai`, `ws` (+ `@types/ws`), `tsx` (run TS custom server),
`vitest` (tests).
