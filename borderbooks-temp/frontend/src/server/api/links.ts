import type { LinkStatus } from "@prisma/client";
import { ApiError, type ApiContext } from "./context";

export async function setLinkStatus(context: ApiContext, runId: string, linkId: string, status: LinkStatus) {
  const link = await context.db.matchLink.findUnique({
    where: { id: linkId },
    include: { run: true },
  });
  if (!link || link.runId !== runId) throw new ApiError(404, "MATCH_LINK_NOT_FOUND", "Match link not found");

  const membership = await context.db.membership.findUnique({
    where: { workspaceId_userId: { workspaceId: link.run.workspaceId, userId: context.user.id } }
  });
  if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "Workspace membership required");

  return context.db.$transaction(async (tx) => {
    const updated = await tx.matchLink.update({ where: { id: link.id }, data: { status } });
    await tx.auditEvent.create({
      data: {
        workspaceId: link.run.workspaceId,
        userId: context.user.id,
        action: status === "ACCEPTED" ? "ACCEPT" : "REJECT",
        payload: { runId, linkId },
      },
    });
    return updated;
  });
}
