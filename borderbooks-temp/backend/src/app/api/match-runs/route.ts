export const dynamic = 'force-dynamic';
import { createMatchRun } from "@/server/api/match-runs";
import { requireApiContext } from "@/server/api/context";
import { failure, json, optionalJson } from "@/server/api/http";
import { createRunSchema } from "@/server/api/schemas";

export async function POST(request: Request) {
  try {
    const context = await requireApiContext(request);
    const body = createRunSchema.parse(await optionalJson(request));
    return json(await createMatchRun(context, body), 201);
  } catch (error) {
    return failure(error);
  }
}

export async function GET(request:Request){try{const context=await requireApiContext(request),runs=await context.db.matchRun.findMany({where:{workspaceId:context.workspace.id},orderBy:{createdAt:"desc"},take:50,include:{_count:{select:{links:true}}}});return json({runs})}catch(error){return failure(error)}}
