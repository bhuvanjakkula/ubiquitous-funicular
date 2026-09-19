import { ApiError, type ApiContext } from "./context";

export async function createWorkspace(context: ApiContext, name: string) {
  if (context.workspace.plan === "STUDIO") throw new ApiError(403, "WORKSPACE_LIMIT", "Studio supports one workspace");
  return context.db.workspace.create({ data: { name, plan: "COMMERCE", memberships: { create: { userId: context.user.id, role: "owner" } } } });
}
