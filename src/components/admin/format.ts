export function timeAgo(date: Date, now = Date.now()): string {
  const seconds = Math.round((now - date.getTime()) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function fullTime(date: Date): string {
  return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

// Provider costs are often fractions of a cent, so small amounts keep four places.
export function usd(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  return `${sign}$${Math.abs(amount).toFixed(Math.abs(amount) < 1 ? 4 : 2)}`;
}

// Tiny amounts (a balance just below zero after running out) keep all six places,
// so they never show as a bare "-0".
export function credits(amount: number): string {
  const digits = amount !== 0 && Math.abs(amount) < 0.01 ? 6 : 3;
  return amount.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function duration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export const ACTIVITY_LABELS: Record<string, string> = {
  signed_up: "Signed up",
  signed_in: "Signed in",
  signed_out: "Signed out",
  credits_granted: "Credits granted",
  credits_topped_up: "Topped up",
  credits_adjusted: "Credits adjusted",
  credits_ran_out: "Ran out",
  session_ended: "Session",
};
