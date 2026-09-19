import { json } from "@/server/api/http";
import { applyStripeEvent, stripeClient } from "@/server/billing/stripe";
import { db } from "@/server/db/client";

// Stripe receives billing identifiers only. Statement and upload data is never sent to Stripe or used for model training.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return json({ error: "Missing Stripe webhook signature", code: "INVALID_SIGNATURE" }, 400);
  try {
    const event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret);
    await applyStripeEvent(db, event);
    return json({ received: true });
  } catch (error) {
    console.error("Stripe webhook rejected:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Invalid Stripe webhook", code: "INVALID_SIGNATURE" }, 400);
  }
}
