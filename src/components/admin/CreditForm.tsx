"use client";

import { useActionState } from "react";
import { adjustCreditsAction, type CreditResult } from "@/app/admin/actions";
import { Button } from "../Button";

export function CreditForm({ userId }: { userId: string }) {
  const [result, submit, pending] = useActionState<CreditResult | null, FormData>(
    adjustCreditsAction.bind(null, userId),
    null,
  );

  return (
    <form action={submit} className="admin-credit-form">
      <label className="settings-row login-field admin-field">
        <input
          className="login-input"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Amount, e.g. 5 or -0.5"
          aria-label="Credits"
          required
        />
      </label>
      <div className="admin-credit-actions">
        <Button type="submit" height={36} disabled={pending} name="mode" value="set">
          Set balance
        </Button>
        <Button type="submit" height={36} disabled={pending} name="mode" value="add">
          Add
        </Button>
      </div>
      {result && (
        <p className="admin-form-note" data-ok={result.ok} role="status">
          {result.message}
        </p>
      )}
    </form>
  );
}
