import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { journalCsv, journalRows, workpaperXlsx, type ExportData, type ExportLink } from "@/server/api/exports";

const invoice = { id: "invoice-1", invoiceNumber: "INV-1", customerName: "Customer", currency: "USD", amountMinor: 10000n, dueDate: new Date("2026-01-01T00:00:00Z"), rawJson: {} };
const txn = { id: "txn-1", vendorId: "TXN-1", postedAt: new Date("2026-01-01T00:00:00Z"), valueDate: null, currency: "USD", amountMinor: 9900n, description: "INV-1 fee", rawJson: {} };
const outgoing = { ...txn, id: "txn-2", vendorId: "TXN-2", amountMinor: -2500n, description: "Refund" };
const link: ExportLink = { id: "link-1", status: "PROPOSED", confidence: 80, method: "EXACT_REF", flags: ["SHORT", "FEE"], expectedMinor: 10000n, receivedMinor: 9900n, feeMinor: 100n, fxDiffMinor: 0n, explanation: "Exact reference; amount short; date in window.", invoice, txn };
const base = (): ExportData => ({ runId: "run-1", createdAt: new Date("2026-01-01T00:00:00Z"), settings: {}, links: [link], unmatchedInvoices: [], unallocatedIn: [], unallocatedOut: [outgoing], audit: [] });

describe("workspace journal account labels", () => {
  it("uses defaults when unset and changes labels without changing totals", async () => {
    const defaults = base(), customized = { ...base(), accountLabels: { bank: "Operating cash", bankFee: "Processing fees" } };
    const defaultRows = journalRows(defaults), customRows = journalRows(customized);
    expect(journalCsv(defaults)).toContain(",Bank,AR,");
    expect(journalCsv(customized)).toContain(",Operating cash,AR,");
    expect(customRows.some((row) => row.debit_account === "Operating cash")).toBe(true);
    expect(customRows.some((row) => row.credit_account === "Operating cash")).toBe(true);
    expect(customRows.map((row) => row.amount_minor)).toEqual(defaultRows.map((row) => row.amount_minor));
    expect(customRows.reduce((total, row) => total + BigInt(row.amount_minor), 0n)).toBe(defaultRows.reduce((total, row) => total + BigInt(row.amount_minor), 0n));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await workpaperXlsx(customized));
    const sheet = workbook.getWorksheet("Short payments")!;
    const header = (sheet.getRow(1).values as unknown[]).indexOf("Suggested fee account label");
    expect(sheet.getRow(2).getCell(header).value).toBe("Processing fees");
  });
});
