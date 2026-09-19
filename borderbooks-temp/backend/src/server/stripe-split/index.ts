import Stripe from "stripe";
import { stripeClient } from "../billing/stripe";
import { fetchMidRate } from "../fx";
import type { PrismaClient } from "@prisma/client";

export type SplitLeg = {
  type: "sale" | "fee" | "refund" | "other";
  id: string;
  description: string;
  currency: string;
  amountMinor: number; // in the currency's minor unit (cents, etc.)
  settlementAmountMinor: number;
  settlementCurrency: string;
  fxRate: number;
  fxGainLossMinor: number;
  created: string;
};

export type PayoutSplit = {
  payoutId: string;
  settlementCurrency: string;
  totalSaleMinor: number;
  totalFeeMinor: number;
  totalDepositMinor: number;
  totalFxGainMinor: number;
  totalFxLossMinor: number;
  legs: SplitLeg[];
  midRateUsed: Record<string, number>; // "USD/EUR" -> rate
};

const EXPONENTS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, AUD: 2, CAD: 2, CHF: 2, JPY: 0, KRW: 0,
  HKD: 2, SGD: 2, INR: 2, AED: 2, SAR: 2, BRL: 2, MXN: 2, KWD: 3, BHD: 3,
};

function minorScale(ccy: string): number {
  return Math.pow(10, EXPONENTS[ccy.toUpperCase()] ?? 2);
}

/**
 * Decompose a Stripe payout into sale / deposit / FX gain-loss legs.
 * Uses Stripe's balance_transactions API and compares exchange rates to ECB mid-market.
 */
export async function fetchStripePayoutSplit(
  db: PrismaClient,
  payoutId: string
): Promise<PayoutSplit> {
  const stripe = stripeClient();

  // Fetch payout metadata
  const payout = await stripe.payouts.retrieve(payoutId);
  const settlementCurrency = payout.currency.toUpperCase();

  // Fetch all balance transactions for this payout
  const txns: Stripe.BalanceTransaction[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const page = await stripe.balanceTransactions.list({
      payout: payoutId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    txns.push(...page.data);
    hasMore = page.has_more;
    if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
  }

  // Collect unique currency pairs for FX lookup
  const pairs = new Set<string>();
  for (const txn of txns) {
    const src = txn.currency.toUpperCase();
    if (src !== settlementCurrency) pairs.add(`${src}/${settlementCurrency}`);
  }

  // Fetch mid rates in parallel
  const midRates: Record<string, number> = {};
  await Promise.allSettled(
    [...pairs].map(async (pair) => {
      const [from, to] = pair.split("/");
      try {
        const result = await fetchMidRate(db, from, to, new Date());
        midRates[pair] = result.rate;
      } catch {
        // If rate unavailable, use Stripe's rate as fallback
        midRates[pair] = 0;
      }
    })
  );

  // Build legs
  const legs: SplitLeg[] = [];
  let totalSaleMinor = 0;
  let totalFeeMinor = 0;
  let totalDepositMinor = 0;
  let totalFxGainMinor = 0;
  let totalFxLossMinor = 0;

  for (const txn of txns) {
    const srcCcy = txn.currency.toUpperCase();
    const isCross = srcCcy !== settlementCurrency;
    const pair = `${srcCcy}/${settlementCurrency}`;
    const midRate = isCross ? (midRates[pair] ?? 0) : 1;

    // Stripe gives amount in source currency minor units and net in settlement
    const amountMinor = txn.amount;
    const settlementAmountMinor = txn.amount === txn.net ? txn.net : (txn as any).exchange_rate
      ? Math.round(amountMinor * ((txn as any).exchange_rate ?? 1))
      : txn.net ?? amountMinor;

    // FX gain/loss = (mid-market conversion) - (actual Stripe conversion)
    const midConvertedMinor = isCross && midRate > 0
      ? Math.round((amountMinor / minorScale(srcCcy)) * midRate * minorScale(settlementCurrency))
      : settlementAmountMinor;
    const fxGainLossMinor = midConvertedMinor - settlementAmountMinor;

    const fxRate = isCross && midRate > 0 ? midRate : ((txn as any).exchange_rate ?? 1);

    let type: SplitLeg["type"] = "other";
    if (["charge", "payment"].includes(txn.type)) type = "sale";
    else if (["refund", "payment_refund"].includes(txn.type)) type = "refund";
    else if (["stripe_fee", "application_fee"].includes(txn.type)) type = "fee";

    const leg: SplitLeg = {
      type,
      id: txn.id,
      description: txn.description ?? txn.type,
      currency: srcCcy,
      amountMinor,
      settlementAmountMinor,
      settlementCurrency,
      fxRate,
      fxGainLossMinor,
      created: new Date(txn.created * 1000).toISOString(),
    };

    legs.push(leg);

    if (type === "sale") totalSaleMinor += amountMinor;
    else if (type === "fee") totalFeeMinor += Math.abs(amountMinor);

    totalDepositMinor += settlementAmountMinor;
    if (fxGainLossMinor > 0) totalFxGainMinor += fxGainLossMinor;
    else totalFxLossMinor += Math.abs(fxGainLossMinor);
  }

  return {
    payoutId,
    settlementCurrency,
    totalSaleMinor,
    totalFeeMinor,
    totalDepositMinor,
    totalFxGainMinor,
    totalFxLossMinor,
    legs,
    midRateUsed: midRates,
  };
}
