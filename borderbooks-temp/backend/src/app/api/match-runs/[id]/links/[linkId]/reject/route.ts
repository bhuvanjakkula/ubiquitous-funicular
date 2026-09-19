import { requireApiContext } from "@/server/api/context";
import { failure, json, optionalJson } from "@/server/api/http";
import { setLinkStatus } from "@/server/api/links";
import { emptyBodySchema } from "@/server/api/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  try {
    const context = await requireApiContext(request);
    emptyBodySchema.parse(await optionalJson(request));
    const { id, linkId } = await params;
    return json(await setLinkStatus(context, id, linkId, "REJECTED"));
  } catch (error) {
    return failure(error);
  }
}
