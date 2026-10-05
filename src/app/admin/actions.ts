"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/admin/access";
import { adjustCredits, signOutEverywhere } from "@/server/admin/users";

export interface CreditResult {
  ok: boolean;
  message: string;
}

export async function adjustCreditsAction(
  userId: string,
  _previous: CreditResult | null,
  form: FormData,
): Promise<CreditResult> {
  await requireAdmin();
  const mode = form.get("mode") === "add" ? "add" : "set";
  const error = await adjustCredits(userId, mode, String(form.get("amount") ?? ""));
  if (error) return { ok: false, message: error };
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: "Balance updated." };
}

export async function signOutUserAction(userId: string): Promise<void> {
  await requireAdmin();
  await signOutEverywhere(userId);
  revalidatePath(`/admin/users/${userId}`);
}
