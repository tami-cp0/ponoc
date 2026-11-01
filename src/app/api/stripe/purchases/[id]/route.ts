import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getUser } from "@/server/auth";
import { reconcileOwnedPurchase } from "@/server/payments/stripe";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const signedIn = await getUser(await headers());
  if (!signedIn) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const result = await reconcileOwnedPurchase(signedIn.id, id);
  if (!result) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  return NextResponse.json({ status: result.status, credits: result.credits });
}
