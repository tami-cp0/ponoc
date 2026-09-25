# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone, in any spoken setting where claims get made: serious or casual, official or unofficial. There is no single niche; the common thread is someone hearing (or saying) something checkable and wanting to know, right then, whether it holds up.

## Product Purpose

ponoc calls facts or cap, live. It listens through the browser's microphone, picks out the claims that can be checked, verifies each one against the web, and rules it true or false while the conversation is still happening. Success is a verdict arriving fast enough to matter, backed by evidence the user can open.

## Positioning

Fact-checking at the speed of speech. Instead of pasting text into a search or chatbot afterwards, the user just talks; ponoc does the listening, the triage (what is checkable), and the verification on its own, and hands back one decisive piece of evidence per claim with its sources.

## Operating Context

- Used live, mid-conversation, often while the user's attention is on people rather than the screen.
- The core surface is the deck at `/app`: Start/Stop, a live audio visualizer, a stack of claim cards (verifying → TRUE/FALSE, flip for the finding and sources), and a grid of every verdict.
- Sessions are Start → Stop; each is metered.

## Capabilities and Constraints

- Sign-in required (Google or email magic link). One sign-in per user at a time, across devices.
- English speech only for now.
- Opinions, tastes and predictions are not checked; only claims with a fact of the matter today.
- Verdicts are automated and can be wrong; the product never presents them as official determinations.
- Credits: every new account gets 5 free credits. Credits are charged from real usage (audio minutes, AI tokens, web searches) at a markup. A session can't start at zero and stops when credits run out. Purchased credits never expire. Credit packs: $2 → 10, $10 → 55, $20 → 120, or a custom amount from $2 (5 credits per dollar).
- Payment processing is built separately by another developer; ponoc's side ends at the checkout UI.
- Purchases are non-refundable except where the law requires otherwise. Minimum age 13; 18+ (or a guardian) to buy.

## Brand Commitments

- Name: "ponoc", always lowercase in running text and the wordmark.
- Voice: plain, short, direct. Verdict reasoning leads with the single fact that settles it, no hedging or background.
- No manipulative persuasion: no fake scarcity, countdowns, pre-ticked extras or guilt-trip opt-outs. Trust is the product.

## Evidence on Hand

- Real product surfaces: landing page, deck, legal page, the showcase cards on the landing page (two example claims with real sources).
- No testimonials, customer logos, usage numbers, press or accuracy benchmarks exist. Do not fabricate any.

## Product Principles

1. Fast enough to matter: a verdict after the conversation has moved on is a failure.
2. Show the evidence: every verdict carries its reasoning and sources, one tap away.
3. Stay out of the way: the user's attention belongs to the conversation, not the interface.
4. Honest by default: verdicts admit they can be wrong, and pricing is shown before paying.
5. Credits are shown as credits: never as dollar or minute equivalents in the product UI.
