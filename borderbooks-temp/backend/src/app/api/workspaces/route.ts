import { z } from "zod";
import { requireApiContext } from "@/server/api/context";
import { failure, json, optionalJson } from "@/server/api/http";
import { createWorkspace } from "@/server/api/workspaces";

const schema = z.object({ name: z.string().trim().min(1).max(100) }).strict();

export async function POST(request: Request) {
  try {
    const context = await requireApiContext(request);
    const { name } = schema.parse(await optionalJson(request));
    return json(await createWorkspace(context, name), 201);
  } catch (error) {
    return failure(error);
  }
}
