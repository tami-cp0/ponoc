// Retail price of one credit. The server charges usage at this rate too.
export const CREDIT_USD = 0.2;
export const TRIAL_CREDITS = 5;
export const MIN_PURCHASE_USD = 2;
export const MAX_PURCHASE_USD = 500;
export const LOW_CREDITS = 1;

export interface CreditPack {
  id: string;
  usd: number;
  credits: number;
  bonusPercent: number;
  tag: string | null;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", usd: 2, credits: 10, bonusPercent: 0, tag: null },
  { id: "plus", usd: 10, credits: 55, bonusPercent: 10, tag: "Most popular" },
  { id: "pro", usd: 20, credits: 120, bonusPercent: 20, tag: "Best value" },
];

export const DEFAULT_PACK_ID = "plus";

export interface CheckoutSelection {
  packId: string; // a pack id, or "custom"
  usd: number;
  credits: number;
}

// Custom amounts get no bonus: whole dollars at the base rate.
export function creditsForUsd(usd: number): number {
  return Math.round(usd / CREDIT_USD);
}

export function formatCredits(credits: number): string {
  return credits.toLocaleString(undefined, { maximumFractionDigits: credits < 10 ? 2 : 1 });
}
