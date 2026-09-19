import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parseBankOrPayout, parseInvoices } from "@/server/parsers";
import { createMatchRun } from "@/server/api/match-runs";

const fixture = (name: string) => readFileSync(join(process.cwd(), "tests", "fixtures", name));
const date = (value: string) => new Date(`${value}T00:00:00Z`);

function context(plan: "STUDIO" | "COMMERCE" = "STUDIO") {
  const invoices = parseInvoices(fixture("invoices.csv"), "invoices.csv").rows.map((row, index) => ({ ...row, id: `invoice-${index}`, workspaceId: "workspace-a", uploadId: "upload-invoices", externalId: null, issueDate: date(row.issueDate), dueDate: date(row.dueDate), reference: row.reference ?? null, status: "open", rawJson: row.rawJson }));
  const txns = parseBankOrPayout(fixture("payouts.csv"), "payouts.csv").rows.map((row, index) => ({ ...row, id: `txn-${index}`, workspaceId: "workspace-a", uploadId: "upload-payments", postedAt: date(row.postedAt), valueDate: row.valueDate ? date(row.valueDate) : null, vendorId: row.vendorId ?? null, counterparty: row.counterparty ?? null, reference: row.reference ?? null, endToEndId: row.endToEndId ?? null, rawJson: row.rawJson }));
  const createMany = vi.fn().mockResolvedValue({ count: 7 });
  const tx = { matchRun: { create: vi.fn().mockResolvedValue({ id: "run-1" }) }, matchLink: { createMany }, auditEvent: { create: vi.fn().mockResolvedValue({}) } };
  const db = {
    fileUpload: { findMany: vi.fn().mockResolvedValue([{ id: "upload-invoices", kind: "INVOICES" }, { id: "upload-payments", kind: "PAYMENTS" }]) },
    invoice: { findMany: vi.fn().mockResolvedValue(invoices) },
    bankTxn: { findMany: vi.fn().mockResolvedValue(txns) },
    matchRun: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "run-1", links: [] }) },
    $transaction: vi.fn((callback) => callback(tx)),
  };
  return { api: { db, user: { id: "user-a" }, workspace: { id: "workspace-a", plan }, membership: { id: "membership-a" } } as any, createMany, db };
}

describe("Task 5 persistence", () => {
  it("runs the persisted fixture rows and stores the seven golden links", async () => {
    const test = context();
    const result = await createMatchRun(test.api, { invoiceUploadId: "upload-invoices", paymentUploadId: "upload-payments", settings: {} });
    expect(test.createMany.mock.calls[0][0].data).toHaveLength(7);
    expect(test.createMany.mock.calls[0][0].data.map((link: { status: string }) => link.status)).toEqual(Array(7).fill("PROPOSED"));
    expect(result.unmatchedInvoiceCount).toBe(5);
    expect(result.suggestions).toHaveLength(2);
  });

  it("returns PLAN_LIMIT before creating a Studio run", async () => {
    const test = context();
    test.db.invoice.findMany.mockResolvedValue(Array(2001).fill({}));
    test.db.bankTxn.findMany.mockResolvedValue([]);
    await expect(createMatchRun(test.api, { invoiceUploadId: "upload-invoices", paymentUploadId: "upload-payments", settings: {} })).rejects.toMatchObject({ status: 402, code: "PLAN_LIMIT" });
    expect(test.createMany).not.toHaveBeenCalled();
  });
});
