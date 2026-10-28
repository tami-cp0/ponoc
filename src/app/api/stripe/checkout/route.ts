import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getUser } from "@/server/auth";
import { createOrGetCheckout } from "@/server/payments/stripe";
import type { CheckoutSelection } from "@/shared/credits";

export async function POST(request: Request) {
  const signedIn = await getUser(await headers());
  if (!signedIn) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  try {
    const body = (await request.json()) as { selection?: CheckoutSelection; purchaseId?: string };
    if (!body.selection || !body.purchaseId || !/^[0-9a-f-]{36}$/i.test(body.purchaseId)) {
      return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
    }
    const result = await createOrGetCheckout(signedIn.id, body.selection, body.purchaseId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("stripe checkout creation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start checkout" }, { status: 400 });
  }
}
