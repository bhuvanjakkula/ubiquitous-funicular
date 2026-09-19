import { requireApiContext } from "@/server/api/context";
import { auditExport, journalCsv, loadExportData } from "@/server/api/exports";
import { failure } from "@/server/api/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(request);
    const { id } = await params;
    const csv = journalCsv(await loadExportData(context, id));
    await auditExport(context, id, "journals.csv");
    return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="borderbooks-${id}-journals.csv"` } });
  } catch (error) {
    return failure(error);
  }
}
