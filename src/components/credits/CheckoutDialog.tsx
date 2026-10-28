"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CREDIT_PACKS,
  DEFAULT_PACK_ID,
  MAX_PURCHASE_USD,
  MIN_PURCHASE_USD,
  creditsForUsd,
  formatPurchasePrice,
  type CheckoutSelection,
} from "@/shared/credits";
import { Dialog } from "../Dialog";
import { CloseIcon } from "../icons";
import { Button } from "../Button";

const CUSTOM = "custom";

interface Props {
  open: boolean;
  onClose: () => void;
  onContinue?: (selection: CheckoutSelection) => Promise<void> | void;
}

export function CheckoutDialog({ open, onClose, onContinue }: Props) {
  const [packId, setPackId] = useState(DEFAULT_PACK_ID);
  const [customUsd, setCustomUsd] = useState("");
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchase_id");
  const paymentResult = searchParams.get("checkout");
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const custom = Number(customUsd);
  const customValid = Number.isInteger(custom) && custom >= MIN_PURCHASE_USD && custom <= MAX_PURCHASE_USD;
  const pack = CREDIT_PACKS.find((p) => p.id === packId);

  const selection: CheckoutSelection | null =
    packId === CUSTOM
      ? customValid
        ? { packId: CUSTOM, usd: custom, credits: creditsForUsd(custom) }
        : null
      : pack
        ? { packId: pack.id, usd: pack.usd, credits: pack.credits }
        : null;

  const customInvalid = packId === CUSTOM && customUsd !== "" && !customValid;
  const customHelp = !customInvalid
    ? `From $${MIN_PURCHASE_USD}`
    : custom < MIN_PURCHASE_USD
      ? `Minimum is $${MIN_PURCHASE_USD}`
      : custom > MAX_PURCHASE_USD
        ? `Maximum is $${MAX_PURCHASE_USD}`
        : "Whole dollars only";

  useEffect(() => {
    if (!open || paymentResult !== "success" || !purchaseId) return;
    let active = true;
    const poll = async () => {
      const response = await fetch(`/api/stripe/purchases/${purchaseId}`);
      if (!response.ok) return;
      const result = (await response.json()) as { status: string };
      if (active) setPurchaseStatus(result.status);
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open, paymentResult, purchaseId]);

  if ((paymentResult === "success" || paymentResult === "cancelled") && purchaseId) {
    const confirmed = purchaseStatus === "paid";
    const failed = purchaseStatus === "failed";
    return (
      <Dialog open={open} onClose={onClose} label="Payment status" className="checkout">
        <header className="settings-head">
          <h2 className="settings-title font-array">
            {paymentResult === "cancelled"
              ? "Payment cancelled"
              : confirmed
                ? "Credits added"
                : failed
                  ? "Payment not completed"
                  : "Confirming payment"}
          </h2>
          <Button aria-label="Close" width={38} height={38} onClick={onClose}>
            <CloseIcon />
          </Button>
        </header>
        <p>
          {paymentResult === "cancelled"
            ? "No payment was made. You can try again whenever you are ready."
            : failed
              ? "The payment was not completed. You can try again."
              : confirmed
                ? "Your credits are ready."
                : "Stripe is confirming your payment. This can take a moment."}
        </p>
        {(confirmed || failed) && (
          <Button width="100%" onClick={onClose}>
            Done
          </Button>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} label="Add credits" className="checkout">
      <header className="settings-head">
        <h2 className="settings-title font-array">Add credits</h2>
        <Button aria-label="Close" width={38} height={38} onClick={onClose}>
          <CloseIcon />
        </Button>
      </header>

      <fieldset className="checkout-packs">
        <legend className="sr-only">Choose a credit pack</legend>
        {CREDIT_PACKS.map((p) => (
          <label key={p.id} className="checkout-pack">
            <input
              type="radio"
              name="credit-pack"
              className="sr-only"
              value={p.id}
              checked={p.id === packId}
              onChange={() => setPackId(p.id)}
            />
            <span className="checkout-pack-amount">
              <span className="checkout-pack-credits font-array">{p.credits}</span>
              <span className="checkout-pack-unit">credits</span>
            </span>
            <span className="checkout-pack-detail">
              {p.bonusPercent > 0 && <span className="checkout-bonus">+{p.bonusPercent}% bonus credits</span>}
            </span>
            <span className="checkout-pack-price">{formatPurchasePrice(p.usd)}</span>
            {p.tag && <span className="checkout-tag">{p.tag}</span>}
          </label>
        ))}

        <label className="checkout-pack">
          <input
            type="radio"
            name="credit-pack"
            className="sr-only"
            value={CUSTOM}
            checked={packId === CUSTOM}
            onChange={() => setPackId(CUSTOM)}
          />
          <span className="checkout-pack-amount">
            <span className="checkout-pack-credits font-array">{customValid ? creditsForUsd(custom) : "–"}</span>
            <span className="checkout-pack-unit">credits</span>
          </span>
          <span className="checkout-pack-detail">
            <span className="checkout-custom-label">Custom</span>
            <span className="checkout-custom-help" data-invalid={customInvalid} id="custom-help">
              {customHelp}
            </span>
          </span>
          <span className="checkout-custom-field">
            <span aria-hidden>CA$</span>
            <input
              className="checkout-custom-input"
              type="number"
              inputMode="numeric"
              min={MIN_PURCHASE_USD}
              max={MAX_PURCHASE_USD}
              step={1}
              placeholder={String(MIN_PURCHASE_USD)}
              aria-label="Custom amount in dollars"
              aria-describedby="custom-help"
              aria-invalid={customInvalid}
              value={customUsd}
              onFocus={() => setPackId(CUSTOM)}
              onChange={(e) => setCustomUsd(e.target.value)}
            />
          </span>
        </label>
      </fieldset>

      {error && <p role="alert">{error}</p>}
      <Button
        width="100%"
        disabled={!selection || starting}
        onClick={() => {
          if (!selection || !onContinue) return;
          setError(null);
          setStarting(true);
          void Promise.resolve(onContinue(selection))
            .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to start checkout"))
            .finally(() => setStarting(false));
        }}
      >
        {starting ? "Opening secure checkout…" : selection ? `Continue to payment · ${formatPurchasePrice(selection.usd)}` : "Continue to payment"}
      </Button>
    </Dialog>
  );
}
