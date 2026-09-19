import { describe, it, expect } from "vitest";
import { exportMatchedLinks } from "../../src/server/exports/csv-export";
import type { ExportedLink } from "../../src/server/exports/csv-export";

const BASE_LINK: ExportedLink = {
  invoiceNumber: "INV-001",
  customerName: "Acme Corp",
  invoiceCurrency: "USD",
  invoiceAmountMinor: "100000",
  txnCurrency: "USD",
  txnAmountMinor: "100000",
  fxRate: null,
  fxDiffMinor: "0",
  feeMinor: "0",
  method: "EXACT_REF",
  confidence: 95,
  status: "ACCEPTED",
  explanation: "Exact invoice number INV-001",
  txnDate: "2024-01-15",
  postedAt: "2024-01-15",
};

describe("exportMatchedLinks", () => {
  it("produces the correct header row", () => {
    const csv = exportMatchedLinks([]);
    const headers = csv.split("\r\n")[0];
    expect(headers).toContain("InvoiceNumber");
    expect(headers).toContain("FxRate");
    expect(headers).toContain("FxDiffMinor");
    expect(headers).toContain("Explanation");
    expect(headers).toContain("TxnDate");
  });

  it("formats minor amounts as major decimal strings", () => {
    const csv = exportMatchedLinks([BASE_LINK]);
    const row = csv.split("\r\n")[1];
    // 100000 minor USD = 1000.00 major
    expect(row).toContain("1000.00");
  });

  it("includes one data row per link", () => {
    const links = [BASE_LINK, { ...BASE_LINK, invoiceNumber: "INV-002" }];
    const csv = exportMatchedLinks(links);
    const rows = csv.split("\r\n");
    expect(rows).toHaveLength(3); // header + 2 data rows
  });

  it("escapes commas in customer names", () => {
    const link = { ...BASE_LINK, customerName: "Smith, Jones & Co" };
    const csv = exportMatchedLinks([link]);
    const row = csv.split("\r\n")[1];
    expect(row).toContain('"Smith, Jones & Co"');
  });

  it("escapes double quotes in explanation", () => {
    const link = { ...BASE_LINK, explanation: 'Has "quoted" text' };
    const csv = exportMatchedLinks([link]);
    const row = csv.split("\r\n")[1];
    expect(row).toContain('"Has ""quoted"" text"');
  });

  it("outputs fxRate as empty string when null", () => {
    const link = { ...BASE_LINK, fxRate: null };
    const csv = exportMatchedLinks([link]);
    const row = csv.split("\r\n")[1];
    const cols = row.split(",");
    // FxRate is 7th column (0-indexed 6)
    expect(cols[6]).toBe("");
  });

  it("outputs fxRate value when present", () => {
    const link = { ...BASE_LINK, fxRate: "0.924000", txnCurrency: "EUR" };
    const csv = exportMatchedLinks([link]);
    const row = csv.split("\r\n")[1];
    expect(row).toContain("0.924000");
  });

  it("handles zero minor amounts", () => {
    const link = { ...BASE_LINK, fxDiffMinor: "0", feeMinor: "0" };
    const csv = exportMatchedLinks([link]);
    expect(csv).not.toContain("undefined");
    expect(csv).not.toContain("NaN");
  });

  it("handles JPY (zero exponent) correctly", () => {
    const link: ExportedLink = {
      ...BASE_LINK,
      invoiceCurrency: "JPY",
      invoiceAmountMinor: "150000",
      txnCurrency: "JPY",
      txnAmountMinor: "150000",
    };
    const csv = exportMatchedLinks([link]);
    const row = csv.split("\r\n")[1];
    // 150000 JPY minor = 150000 (no decimal)
    expect(row).toContain("150000");
  });
});
