import { requireApiContext } from "@/server/api/context";
import { auditExport, loadExportData, workpaperXlsx } from "@/server/api/exports";
import { failure } from "@/server/api/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(request);
    const { id } = await params;
    const file = await workpaperXlsx(await loadExportData(context, id));
    await auditExport(context, id, "xlsx");
    return new Response(file, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="borderbooks-${id}.xlsx"` } });
  } catch (error) {
    return failure(error);
  }
}
