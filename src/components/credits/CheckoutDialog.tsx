"use client";

import { useState } from "react";
import {
  CREDIT_PACKS,
  DEFAULT_PACK_ID,
  MAX_PURCHASE_USD,
  MIN_PURCHASE_USD,
  creditsForUsd,
  type CheckoutSelection,
} from "@/shared/credits";
import { Dialog } from "../Dialog";
import { CloseIcon } from "../icons";
import { Button } from "../Button";

const CUSTOM = "custom";

interface Props {
  open: boolean;
  onClose: () => void;
  // Payment is wired up separately; this is where it takes over.
  onContinue?: (selection: CheckoutSelection) => void;
}

export function CheckoutDialog({ open, onClose, onContinue }: Props) {
  const [packId, setPackId] = useState(DEFAULT_PACK_ID);
  const [customUsd, setCustomUsd] = useState("");

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
            <span className="checkout-pack-price">${p.usd}</span>
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
            <span aria-hidden>$</span>
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

      <Button width="100%" disabled={!selection} onClick={() => selection && onContinue?.(selection)}>
        {selection ? `Continue to payment · $${selection.usd}` : "Continue to payment"}
      </Button>
    </Dialog>
  );
}
