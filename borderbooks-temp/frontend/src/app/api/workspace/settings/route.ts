export const dynamic = 'force-dynamic';
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireApiContext } from "@/server/api/context";
import { failure, json, optionalJson } from "@/server/api/http";
import { DEFAULT_ACCOUNT_LABELS, resolveAccountLabels } from "@/server/account-labels";

const label = z.string().trim().min(1).max(100);
const schema = z.object({ bank: label.optional(), ar: label.optional(), bankFee: label.optional(), shortRemainder: label.optional(), unapplied: label.optional(), unallocated: label.optional(), fxGainLoss: label.optional() }).strict();

export async function GET(request: Request) {
  try {
    const context = await requireApiContext(request);
    return json({ accountLabels: resolveAccountLabels(context.workspace.accountLabels) });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireApiContext(request);
    const update = schema.parse(await optionalJson(request));
    const accountLabels = resolveAccountLabels({ ...resolveAccountLabels(context.workspace.accountLabels), ...update });
    await context.db.workspace.update({ where: { id: context.workspace.id }, data: { accountLabels: accountLabels as unknown as Prisma.InputJsonValue } });
    return json({ accountLabels });
  } catch (error) { return failure(error); }
}
