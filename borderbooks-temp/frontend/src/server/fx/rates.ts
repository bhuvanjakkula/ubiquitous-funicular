import { PrismaClient } from "@prisma/client";

const FRANKFURTER_BASE = "https://api.frankfurter.app";

export type FxRateResult = {
  base: string;
  quote: string;
  date: string;
  rate: number;
  source: string;
};

/** Canonical date string YYYY-MM-DD */
export function toDateStr(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Fetch a single mid-market rate, caching in the DB by (base, quote, date). */
export async function fetchMidRate(
  db: PrismaClient,
  base: string,
  quote: string,
  date: Date | string
): Promise<FxRateResult> {
  const dateStr = toDateStr(date);
  const b = base.toUpperCase();
  const q = quote.toUpperCase();

  if (b === q) return { base: b, quote: q, date: dateStr, rate: 1, source: "identity" };

  // 1. Check DB cache
  const cached = await (db as any).fxRate.findUnique({
    where: { base_quote_date: { base: b, quote: q, date: dateStr } },
  }).catch(() => null);
  if (cached) {
    return { base: b, quote: q, date: dateStr, rate: Number(cached.rate), source: cached.source };
  }

  // 2. Fetch from Frankfurter (ECB)
  const url = `${FRANKFURTER_BASE}/${dateStr}?from=${b}&to=${q}`;
  const res = await fetch(url, { next: { revalidate: 86400 } } as RequestInit);
  if (!res.ok) {
    // Try "latest" as fallback
    const fallbackUrl = `${FRANKFURTER_BASE}/latest?from=${b}&to=${q}`;
    const fallback = await fetch(fallbackUrl);
    if (!fallback.ok) throw new Error(`FX rate unavailable for ${b}/${q} on ${dateStr}`);
    const fallbackData = await fallback.json() as { date: string; rates: Record<string, number> };
    const rate = fallbackData.rates[q];
    if (!rate) throw new Error(`Quote currency ${q} not in Frankfurter response`);
    return { base: b, quote: q, date: fallbackData.date, rate, source: "frankfurter-latest" };
  }

  const data = await res.json() as { date: string; rates: Record<string, number> };
  const rate = data.rates[q];
  if (!rate) throw new Error(`Quote currency ${q} not in Frankfurter response`);

  // 3. Persist to cache
  await (db as any).fxRate.upsert({
    where: { base_quote_date: { base: b, quote: q, date: dateStr } },
    create: { base: b, quote: q, date: dateStr, rate, source: "frankfurter" },
    update: { rate, source: "frankfurter" },
  }).catch(() => { /* ignore write errors — cache is best-effort */ });

  return { base: b, quote: q, date: dateStr, rate, source: "frankfurter" };
}

/** Fetch the last N days of rates for a pair (for sparkline charts). */
export async function fetchRateHistory(
  db: PrismaClient,
  base: string,
  quote: string,
  days = 30
): Promise<FxRateResult[]> {
  const b = base.toUpperCase();
  const q = quote.toUpperCase();
  if (b === q) {
    const results: FxRateResult[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      results.push({ base: b, quote: q, date: toDateStr(d), rate: 1, source: "identity" });
    }
    return results;
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const url = `${FRANKFURTER_BASE}/${toDateStr(startDate)}..${toDateStr(endDate)}?from=${b}&to=${q}`;
  const res = await fetch(url);
  if (!res.ok) {
    const fallback = await fetch(`${FRANKFURTER_BASE}/latest?from=${b}&to=${q}`);
    if (!fallback.ok) throw new Error(`FX history unavailable for ${b}/${q}`);
    const data = await fallback.json() as { date: string; rates: Record<string, number> };
    const rate = data.rates[q] ?? 0;
    const fallbackResults: FxRateResult[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      fallbackResults.push({ base: b, quote: q, date: toDateStr(d), rate, source: "frankfurter-latest" });
    }
    return fallbackResults;
  }
  const data = await res.json() as { rates: Record<string, Record<string, number>> };

  const results: FxRateResult[] = Object.entries(data.rates).map(([date, rateMap]) => ({
    base: b,
    quote: q,
    date,
    rate: rateMap[q] ?? 0,
    source: "frankfurter",
  }));

  // Fire-and-forget: cache all fetched rates
  Promise.allSettled(
    results.map((r) =>
      (db as any).fxRate.upsert({
        where: { base_quote_date: { base: b, quote: q, date: r.date } },
        create: { base: b, quote: q, date: r.date, rate: r.rate, source: r.source },
        update: { rate: r.rate, source: r.source },
      })
    )
  ).catch(() => {});

  return results;
}

/**
 * Convert an amount in minor units from one currency to another.
 * Returns the converted amount in minor units of the target currency.
 */
export function convertMinor(
  amountMinor: bigint,
  fromCcy: string,
  toCcy: string,
  rate: number,
  fromExponent: number,
  toExponent: number
): bigint {
  if (fromCcy === toCcy) return amountMinor;
  // Convert to major, apply rate, convert back to minor
  const major = Number(amountMinor) / Math.pow(10, fromExponent);
  const converted = major * rate;
  return BigInt(Math.round(converted * Math.pow(10, toExponent)));
}
