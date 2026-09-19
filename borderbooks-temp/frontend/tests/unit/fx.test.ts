import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchMidRate, convertMinor, toDateStr } from "../../src/server/fx/rates";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Minimal DB mock
function makeDb(cached: Record<string, unknown> | null = null) {
  return {
    fxRate: {
      findUnique: vi.fn().mockResolvedValue(cached),
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
}

describe("toDateStr", () => {
  it("formats Date objects", () => {
    expect(toDateStr(new Date("2024-03-15T12:00:00Z"))).toBe("2024-03-15");
  });
  it("passes string through", () => {
    expect(toDateStr("2024-03-15T00:00:00Z")).toBe("2024-03-15");
  });
});

describe("fetchMidRate", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 1 for identical currencies", async () => {
    const db = makeDb();
    const result = await fetchMidRate(db as any, "USD", "USD", "2024-01-01");
    expect(result.rate).toBe(1);
    expect(result.source).toBe("identity");
    expect(db.fxRate.findUnique).not.toHaveBeenCalled();
  });

  it("returns cached rate without calling Frankfurter", async () => {
    const db = makeDb({ rate: 1.08, source: "frankfurter" });
    const result = await fetchMidRate(db as any, "USD", "EUR", "2024-01-15");
    expect(result.rate).toBe(1.08);
    expect(result.source).toBe("frankfurter");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches from Frankfurter on cache miss and caches result", async () => {
    const db = makeDb(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ date: "2024-01-15", rates: { EUR: 0.924 } }),
    });
    const result = await fetchMidRate(db as any, "USD", "EUR", "2024-01-15");
    expect(result.rate).toBe(0.924);
    expect(result.source).toBe("frankfurter");
    expect(db.fxRate.upsert).toHaveBeenCalledOnce();
  });

  it("uppercases base and quote currencies", async () => {
    const db = makeDb(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ date: "2024-01-15", rates: { EUR: 0.9 } }),
    });
    const result = await fetchMidRate(db as any, "usd", "eur", "2024-01-15");
    expect(result.base).toBe("USD");
    expect(result.quote).toBe("EUR");
  });

  it("falls back to latest endpoint on date failure", async () => {
    const db = makeDb(null);
    mockFetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ date: "2024-01-12", rates: { GBP: 0.78 } }),
      });
    const result = await fetchMidRate(db as any, "USD", "GBP", "2024-01-15");
    expect(result.rate).toBe(0.78);
    expect(result.source).toBe("frankfurter-latest");
  });
});

describe("convertMinor", () => {
  it("returns same amount for same currency", () => {
    expect(convertMinor(1000n, "USD", "USD", 1, 2, 2)).toBe(1000n);
  });

  it("converts USD to EUR at rate 0.92", () => {
    // $10.00 → €9.20
    const result = convertMinor(1000n, "USD", "EUR", 0.92, 2, 2);
    expect(result).toBe(920n);
  });

  it("converts USD to JPY at rate 149.5 (JPY has 0 exponent)", () => {
    // $10.00 → ¥1495
    const result = convertMinor(1000n, "USD", "JPY", 149.5, 2, 0);
    expect(result).toBe(1495n);
  });

  it("handles fractional minor units by rounding", () => {
    // $3.33 * 0.92 = €3.0636 → 306 minor
    const result = convertMinor(333n, "USD", "EUR", 0.92, 2, 2);
    expect(result).toBe(306n);
  });
});
