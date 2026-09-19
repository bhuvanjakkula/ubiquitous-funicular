import { ApiError, requireApiContext } from "@/server/api/context";
import { failure, json } from "@/server/api/http";
import { exportMatchedLinks } from "@/server/exports/csv-export";
import type { ExportedLink } from "@/server/exports/csv-export";

export async function GET(request: Request, props: any) {
  try {
    const context = await requireApiContext(request);
    const params = await props.params;
    const id = params.id;
    const format = new URL(request.url).searchParams.get("format");

    const run = await context.db.matchRun.findUnique({
      where: { id },
      include: { links: { include: { invoice: true, txn: true } } },
    });
    if (!run) throw new ApiError(404, "MATCH_RUN_NOT_FOUND", "Match run not found");

    const membership = await context.db.membership.findUnique({
      where: { workspaceId_userId: { workspaceId: run.workspaceId, userId: context.user.id } }
    });
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "Workspace membership required");

    // ── CSV export ──────────────────────────────────────────────────────────
    if (format === "csv") {
      const exportLinks: ExportedLink[] = run.links.map((link) => ({
        invoiceNumber: link.invoice.invoiceNumber,
        customerName: link.invoice.customerName,
        invoiceCurrency: link.invoice.currency,
        invoiceAmountMinor: link.expectedMinor.toString(),
        txnCurrency: link.txn.currency,
        txnAmountMinor: link.receivedMinor.toString(),
        fxRate: (link as any).fxRate != null ? String((link as any).fxRate) : null,
        fxDiffMinor: link.fxDiffMinor.toString(),
        feeMinor: link.feeMinor.toString(),
        method: link.method,
        confidence: link.confidence,
        status: link.status,
        explanation: link.explanation,
        txnDate: (link.txn.valueDate ?? link.txn.postedAt).toISOString().slice(0, 10),
        postedAt: link.txn.postedAt.toISOString().slice(0, 10),
      }));

      const csv = exportMatchedLinks(exportLinks);

      await context.db.auditEvent.create({
        data: {
          workspaceId: run.workspaceId,
          userId: context.user.id,
          action: "EXPORT",
          payload: { runId: id, format: "csv" },
        },
      });

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="run-${id.slice(-8)}.csv"`,
        },
      });
    }

    // ── Default JSON ─────────────────────────────────────────────────────────
    const [uploads, invoices, txns] = await Promise.all([
      context.db.fileUpload.findMany({
        where: { workspaceId: run.workspaceId, id: { in: [run.invoiceUploadId, run.paymentUploadId] } },
        select: { id: true, kind: true, parseErrors: true },
      }),
      context.db.invoice.findMany({ where: { workspaceId: run.workspaceId, uploadId: run.invoiceUploadId } }),
      context.db.bankTxn.findMany({ where: { workspaceId: run.workspaceId, uploadId: run.paymentUploadId } }),
    ]);
    const linkedInvoiceIds = new Set(run.links.map((link) => link.invoiceId));
    const linkedTxnIds = new Set(run.links.map((link) => link.txnId));

    return json({
      ...run,
      parseErrors: uploads.flatMap((upload) => (Array.isArray(upload.parseErrors) ? upload.parseErrors : [])),
      unmatchedInvoices: invoices.filter((invoice) => !linkedInvoiceIds.has(invoice.id)),
      unallocated_in: txns.filter((txn) => txn.amountMinor > 0n && !linkedTxnIds.has(txn.id)),
      unallocated_out: txns.filter((txn) => txn.amountMinor < 0n && !linkedTxnIds.has(txn.id)),
    });
  } catch (error) {
    return failure(error);
  }
}
