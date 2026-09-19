import { Prisma, type BankTxn, type Invoice } from "@prisma/client";
import { runMatch } from "../matching/engine";
import type { ParsedInvoice, ParsedTxn, RawRow } from "../parsers";
import { ApiError, type ApiContext } from "./context";

const utcDate = (value: Date) => value.toISOString().slice(0, 10);
const asRaw = (value: Prisma.JsonValue): RawRow => value as RawRow;

function matcherInvoice(row: Invoice): ParsedInvoice {
  return { invoiceNumber: row.invoiceNumber, customerName: row.customerName, currency: row.currency, amountMinor: row.amountMinor, issueDate: utcDate(row.issueDate), dueDate: utcDate(row.dueDate), reference: row.reference ?? undefined, rawJson: asRaw(row.rawJson), fingerprint: row.fingerprint };
}

function matcherTxn(row: BankTxn): ParsedTxn {
  return { source: row.source, vendorId: row.vendorId ?? undefined, postedAt: utcDate(row.postedAt), valueDate: row.valueDate ? utcDate(row.valueDate) : undefined, currency: row.currency, amountMinor: row.amountMinor, description: row.description, counterparty: row.counterparty ?? undefined, reference: row.reference ?? undefined, endToEndId: row.endToEndId ?? undefined, rawJson: asRaw(row.rawJson), fingerprint: row.fingerprint };
}

export async function createMatchRun(context: ApiContext, input: { invoiceUploadId: string; paymentUploadId: string; settings: Record<string, unknown> }) {
  const uploads = await context.db.fileUpload.findMany({ where: { workspaceId: context.workspace.id, id: { in: [input.invoiceUploadId, input.paymentUploadId] } } });
  const invoiceUpload = uploads.find((item) => item.id === input.invoiceUploadId && item.kind === "INVOICES");
  const paymentUpload = uploads.find((item) => item.id === input.paymentUploadId && item.kind === "PAYMENTS");
  if (!invoiceUpload || !paymentUpload) throw new ApiError(404, "UPLOAD_NOT_FOUND", "Workspace uploads not found or have the wrong kind");
  const [invoiceRows, txnRows] = await Promise.all([
    context.db.invoice.findMany({ where: { workspaceId: context.workspace.id, uploadId: invoiceUpload.id } }),
    context.db.bankTxn.findMany({ where: { workspaceId: context.workspace.id, uploadId: paymentUpload.id } }),
  ]);
  const rowCount = invoiceRows.length + txnRows.length;
  const limit = context.workspace.plan === "COMMERCE" ? 10_000 : 2_000;
  if (rowCount > limit) throw new ApiError(402, "PLAN_LIMIT", `Plan allows ${limit} rows per run`);
  const invoices = invoiceRows.map(matcherInvoice), txns = txnRows.map(matcherTxn), result = runMatch(invoices, txns, input.settings);
  const invoiceIds = new Map(invoiceRows.map((row) => [row.invoiceNumber, row.id]));
  const txnIds = new Map(txnRows.map((row) => [row.vendorId ?? row.fingerprint, row.id]));
  const run = await context.db.$transaction(async (tx) => {
    const created = await tx.matchRun.create({ data: { workspaceId: context.workspace.id, invoiceUploadId: invoiceUpload.id, paymentUploadId: paymentUpload.id, settings: input.settings as Prisma.InputJsonValue } });
    if (result.links.length) await tx.matchLink.createMany({ data: result.links.map((link) => ({ runId: created.id, invoiceId: invoiceIds.get(link.invoiceNumber)!, txnId: txnIds.get(link.txnId)!, confidence: link.confidence, method: link.method, flags: link.flags, status: "PROPOSED", expectedMinor: BigInt(link.expectedMinor), receivedMinor: BigInt(link.receivedMinor), feeMinor: BigInt(link.feeMinor), fxDiffMinor: BigInt(link.fxDiffMinor), explanation: link.explanation })) });
    await tx.auditEvent.create({ data: { workspaceId: context.workspace.id, userId: context.user.id, action: "RUN", payload: { runId: created.id, invoiceUploadId: invoiceUpload.id, paymentUploadId: paymentUpload.id, rowCount, linkCount: result.links.length } } });
    return created;
  });
  const persisted = await context.db.matchRun.findUniqueOrThrow({ where: { id: run.id }, include: { links: { include: { invoice: true, txn: true } } } });
  return { ...persisted, buckets: { matched: result.links.filter((link) => link.bucket === "matched"), short_payment: result.links.filter((link) => link.bucket === "short_payment"), fx_gap: result.links.filter((link) => link.bucket === "fx_gap"), unallocated_in: result.unallocated_in, unallocated_out: result.unallocated_out }, unmatchedInvoiceCount: result.unmatchedInvoices.length, unmatchedInvoices: result.unmatchedInvoices, unallocated_in: result.unallocated_in, unallocated_out: result.unallocated_out, suggestions: result.suggestions };
}
