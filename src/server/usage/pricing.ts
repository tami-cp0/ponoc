// Provider prices come from env. See the README.

import { CREDIT_USD } from "@/shared/credits";

export { CREDIT_USD };
export const MARKUP = 2;

export type ModelRole = "triage" | "verify";

export interface TokenPrice {
  // USD per 1M tokens.
  input: number;
  output: number;
}

export interface Prices {
  triage: TokenPrice;
  verify: TokenPrice;
  webSearch: number; // USD per search
  audioPerMinute: number; // USD per minute
}

export interface TokenCount {
  input: number;
  output: number;
}

export interface BillableUsage {
  audioSeconds: number;
  webSearches: number;
  triage: TokenCount;
  verify: TokenCount;
}

export function costUsd(usage: BillableUsage, prices: Prices): number {
  return (
    tokenCost(usage.triage, prices.triage) +
    tokenCost(usage.verify, prices.verify) +
    usage.webSearches * prices.webSearch +
    (usage.audioSeconds / 60) * prices.audioPerMinute
  );
}

function tokenCost(tokens: TokenCount, price: TokenPrice): number {
  return (tokens.input * price.input + tokens.output * price.output) / 1_000_000;
}

export function creditsFor(cost: number): number {
  return (cost * MARKUP) / CREDIT_USD;
}

export function toMicros(value: number): number {
  return Math.round(value * 1_000_000);
}
