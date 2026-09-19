import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "../db/client";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function requireApiContext(request: Request) {
  const identity = await auth();
  if (!identity.userId) throw new ApiError(401, "UNAUTHENTICATED", "Sign in required");
  let user = await db.user.findUnique({ where: { clerkId: identity.userId } });
  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses[0]?.emailAddress;
    if (!email) throw new ApiError(422, "EMAIL_REQUIRED", "A verified Clerk email is required");
    user = await db.user.upsert({ where: { clerkId: identity.userId }, update: { email }, create: { clerkId: identity.userId, email } });
  }
  const requested = request.headers.get("x-workspace-id");
  let membership = await db.membership.findFirst({
    where: { userId: user.id, ...(requested ? { workspaceId: requested } : {}) },
    include: { workspace: true },
    orderBy: { id: "asc" },
  });
  if (!membership && !requested) {
    const workspace = await db.workspace.create({
      data: { name: "My BorderBooks Workspace", plan: "STUDIO", memberships: { create: { userId: user.id, role: "owner" } } },
    });
    membership = await db.membership.findFirst({ where: { userId: user.id, workspaceId: workspace.id }, include: { workspace: true } });
  }
  if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "Workspace membership required");
  return { db, user, workspace: membership.workspace, membership };
}

export type ApiContext = Awaited<ReturnType<typeof requireApiContext>>;
