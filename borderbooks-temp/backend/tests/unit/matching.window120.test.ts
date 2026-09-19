import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBankOrPayout, parseInvoices } from "@/server/parsers";
import { runMatch } from "@/server/matching/engine";

const fixture = (name: string) => readFileSync(join(process.cwd(), "tests", "fixtures", name));

describe("ORPH-1 120-day date window", () => {
  it("adds INV-1012 and TXN-15 without changing the default golden", () => {
    const invoices = parseInvoices(fixture("invoices.csv"), "invoices.csv");
    const txns = parseBankOrPayout(fixture("payouts.csv"), "payouts.csv");
    expect(invoices.errors).toEqual([]);
    expect(txns.errors).toEqual([]);
    const result = runMatch(invoices.rows, txns.rows, { dateWindowDaysAfter: 120 });
    expect(result.links).toHaveLength(8);
    expect(result.links).toContainEqual(expect.objectContaining({ invoiceNumber: "INV-1012", txnId: "TXN-15", bucket: "matched", method: "EXACT_REF" }));
    expect(result.unallocated_in.map((txn) => txn.vendorId)).not.toContain("TXN-15");
    expect(result.unmatchedInvoices.map((invoice) => invoice.invoiceNumber)).not.toContain("INV-1012");
  });
});
