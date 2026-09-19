import { ApiError, requireApiContext } from "@/server/api/context";
import { failure } from "@/server/api/http";
import { fetchMidRate } from "@/server/fx";
import { generatePaymentCostReport } from "@/server/exports/pdf-report";
import type { PdfLink } from "@/server/exports/pdf-report";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(request);
    const { id } = await params;

    const run = await context.db.matchRun.findUnique({
      where: { id },
      include: { links: { include: { invoice: true, txn: true } } },
    });
    if (!run) throw new ApiError(404, "MATCH_RUN_NOT_FOUND", "Match run not found");

    const membership = await context.db.membership.findUnique({
      where: { workspaceId_userId: { workspaceId: run.workspaceId, userId: context.user.id } }
    });
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "Workspace membership required");

    // Build PDF links with live FX rates for cross-currency pairs
    const pdfLinks: PdfLink[] = await Promise.all(
      run.links.map(async (link) => {
        let fxRate: number | null = null;
        if (link.invoice.currency !== link.txn.currency) {
          try {
            const rate = await fetchMidRate(
              context.db as any,
              link.txn.currency,
              link.invoice.currency,
              link.txn.valueDate ?? link.txn.postedAt
            );
            fxRate = rate.rate;
          } catch { /* leave null if unavailable */ }
        }
        return {
          invoiceNumber: link.invoice.invoiceNumber,
          customerName: link.invoice.customerName,
          invoiceCurrency: link.invoice.currency,
          invoiceAmountMinor: link.expectedMinor.toString(),
          txnCurrency: link.txn.currency,
          txnAmountMinor: link.receivedMinor.toString(),
          fxRate,
          fxDiffMinor: link.fxDiffMinor.toString(),
          feeMinor: link.feeMinor.toString(),
          method: link.method,
          confidence: link.confidence,
          status: link.status,
          explanation: link.explanation,
          txnDate: (link.txn.valueDate ?? link.txn.postedAt).toISOString().slice(0, 10),
        };
      })
    );

    const pdfBuffer = await generatePaymentCostReport({
      workspaceName: context.workspace.name,
      runId: run.id,
      generatedAt: new Date(),
      links: pdfLinks,
    });

    // Log audit event
    await context.db.auditEvent.create({
      data: {
        workspaceId: run.workspaceId,
        userId: context.user.id,
        action: "EXPORT",
        payload: { runId: id, format: "pdf-report" },
      },
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="payment-cost-report-${id.slice(-8)}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    return failure(error);
  }
}
