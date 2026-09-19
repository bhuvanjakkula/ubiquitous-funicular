import { requireApiContext } from "@/server/api/context";
import { failure, json } from "@/server/api/http";
import { z } from "zod";

const querySchema = z.string().trim().max(200).default("");

export async function GET(request: Request) {
  try {
    const context = await requireApiContext(request);
    const q = querySchema.parse(new URL(request.url).searchParams.get("q") ?? "");
    const invoices = await context.db.invoice.findMany({
      where: {
        workspaceId: context.workspace.id,
        ...(q ? { OR: ["invoiceNumber", "customerName", "reference"].map((field) => ({ [field]: { contains: q, mode: "insensitive" as const } })) } : {}),
      },
      orderBy: { dueDate: "desc" },
      take: 25,
    });
    return json({ invoices });
  } catch (error) {
    return failure(error);
  }
}
