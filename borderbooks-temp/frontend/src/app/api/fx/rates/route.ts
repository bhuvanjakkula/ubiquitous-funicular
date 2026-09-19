export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { fetchMidRate, fetchRateHistory } from "@/server/fx";
import { getAuth } from "@clerk/nextjs/server";

export const GET = async (req: NextRequest) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const base = (searchParams.get("base") ?? "USD").toUpperCase();
  const quote = (searchParams.get("quote") ?? "EUR").toUpperCase();
  const date = searchParams.get("date") ?? undefined;
  const history = searchParams.get("history") === "true";

  try {
    if (history) {
      const days = Math.min(365, Math.max(7, Number(searchParams.get("days") ?? 30)));
      const rates = await fetchRateHistory(db as any, base, quote, days);
      return NextResponse.json({ base, quote, history: rates }, { status: 200 });
    }

    const result = await fetchMidRate(db as any, base, quote, date ? new Date(date) : new Date());
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch FX rate";
    return NextResponse.json({ error: message }, { status: 502 });
  }
};
