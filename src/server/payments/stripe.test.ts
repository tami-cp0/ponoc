import { describe, expect, it } from "vitest";
import { snapshotFromSelection } from "./stripe";

describe("Stripe purchase snapshots", () => {
  it("uses the pack's bonus credits and integer USD cents", () => {
    expect(snapshotFromSelection("user-1", "purchase-1", { packId: "plus", usd: 10, credits: 55 })).toMatchObject({
      amountCents: 1000,
      credits: 55,
      currency: "usd",
      presentmentAmount: null,
      presentmentCurrency: null,
    });
  });

  it("allows whole-dollar custom amounts at the base rate", () => {
    expect(snapshotFromSelection("user-1", "purchase-2", { packId: "custom", usd: 7, credits: 35 })).toMatchObject({
      amountCents: 700,
      credits: 35,
    });
  });

  it("rejects fractional, out-of-range, or tampered selections", () => {
    expect(() => snapshotFromSelection("u", "p", { packId: "custom", usd: 2.5, credits: 12.5 })).toThrow();
    expect(() => snapshotFromSelection("u", "p", { packId: "custom", usd: 1, credits: 5 })).toThrow();
    expect(() => snapshotFromSelection("u", "p", { packId: "plus", usd: 10, credits: 10 })).toThrow();
  });
});
