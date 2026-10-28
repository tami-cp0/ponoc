import Stripe from "stripe";
import { fulfillCheckout, markCheckoutFailed } from "@/server/payments/stripe";
import { env } from "@/server/env";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = new Stripe(env.stripeSecretKey).webhooks.constructEvent(
      await request.text(),
      signature,
      env.stripeWebhookSecret,
    );
  } catch (error) {
    console.error("stripe webhook signature verification failed:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await fulfillCheckout(event.data.object as Stripe.Checkout.Session, event.id);
    } else if (event.type === "checkout.session.async_payment_failed") {
      await markCheckoutFailed(event.data.object as Stripe.Checkout.Session, "Payment failed");
    }
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error(`stripe webhook ${event.id} failed:`, error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
