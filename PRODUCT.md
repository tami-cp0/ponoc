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
- The core surface is the deck at `/app`: Start listening/Stop and Clear, a live audio visualizer, a stack of claim cards (verifying → TRUE, FALSE or UNSURE), and a grid of every verdict.
- Cards move by dragging (mouse or trackpad) or swiping (touch): left for the next card, right to go back, up to turn a card over to its finding and sources. On wider screens the arrows beside the deck do the same, and every card's "the finding" button turns it over.
- A session runs from Start listening to Stop; each is metered.
- First visit: a four-step tutorial (what ponoc does, moving through cards, the finding) that ends on the free credits and Start listening. It shows once per account, counted as seen as soon as it opens.

## Capabilities and Constraints

- Sign-in required (Google or email magic link). One sign-in per user at a time, across devices.
- English speech only for now.
- Only claims public sources can settle today are checked. Opinions, tastes, values, religious beliefs, predictions, and private facts only the people involved could confirm (someone's own life, a company's internal numbers) are not.
- Verdicts are automated and can be wrong; the product never presents them as official determinations.
- When nothing on the web settles a claim, or the check itself fails, the card says UNSURE instead of guessing. UNSURE is never used to dodge a close call.
- Credits: every new account gets 5 free credits. Credits are charged from real usage (audio minutes, AI tokens, web searches) at a markup. A session can't start at zero and stops when credits run out. Purchased credits never expire. Credit packs: $2 → 10, $10 → 55, $20 → 120, or a custom amount from $2 (5 credits per dollar).
- Payment processing is built separately by another developer; ponoc's side ends at the checkout UI.
- Purchases are non-refundable except where the law requires otherwise. Minimum age 13; 18+ (or a guardian) to buy.

## Brand Commitments

- Name: "ponoc", always lowercase in running text and the wordmark.
- Voice: plain, short, direct. A finding sounds like a well-informed person saying it out loud: a true claim opens with a plain yes, a false one with what's actually true, then the single most concrete fact that settles it, in the claim's own terms. No hedging, background or talking down to the speaker.
- Instructions name controls exactly as they appear, with the device's verbs: click and drag on laptops, tap and swipe on touch screens.
- No manipulative persuasion: no fake scarcity, countdowns, pre-ticked extras or guilt-trip opt-outs. Trust is the product.

## Evidence on Hand

- Real product surfaces: landing page, deck, first-visit tutorial, legal page, the showcase cards on the landing page (two example claims with real sources: "We only use ten percent of our brains." FALSE, "Grass is green." TRUE).
- No testimonials, customer logos, usage numbers, press or accuracy benchmarks exist. Do not fabricate any.

## Product Principles

1. Fast enough to matter: a verdict after the conversation has moved on is a failure.
2. Show the evidence: every verdict carries its finding and sources, one tap or click away.
3. Stay out of the way: the user's attention belongs to the conversation, not the interface.
4. Honest by default: verdicts admit they can be wrong, say UNSURE rather than guess, and pricing is shown before paying.
5. Credits are shown as credits: never as dollar or minute equivalents in the product UI.
