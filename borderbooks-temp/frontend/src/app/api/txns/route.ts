import { requireApiContext } from "@/server/api/context";
import { failure, json } from "@/server/api/http";
import { z } from "zod";

const querySchema = z.string().trim().max(200).default("");

export async function GET(request: Request) {
  try {
    const context = await requireApiContext(request);
    const q = querySchema.parse(new URL(request.url).searchParams.get("q") ?? "");
    const txns = await context.db.bankTxn.findMany({
      where: {
        workspaceId: context.workspace.id,
        ...(q ? { OR: ["vendorId", "description", "counterparty", "reference", "endToEndId"].map((field) => ({ [field]: { contains: q, mode: "insensitive" as const } })) } : {}),
      },
      orderBy: { postedAt: "desc" },
      take: 25,
    });
    return json({ txns });
  } catch (error) {
    return failure(error);
  }
}
