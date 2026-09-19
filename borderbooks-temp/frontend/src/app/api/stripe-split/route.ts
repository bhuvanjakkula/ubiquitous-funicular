import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { fetchStripePayoutSplit } from "@/server/stripe-split";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not configured. Add it to your environment variables." },
      { status: 400 }
    );
  }

  let payoutId: string;
  try {
    const body = await request.json();
    payoutId = body.payoutId;
    if (!payoutId || typeof payoutId !== "string") throw new Error("payoutId is required");
    if (!payoutId.startsWith("po_")) throw new Error("payoutId must start with 'po_'");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request body" },
      { status: 400 }
    );
  }

  try {
    const split = await fetchStripePayoutSplit(db as any, payoutId);
    return NextResponse.json(split);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch payout split";
    const status = message.includes("No such payout") ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
