import {requireApiContext,ApiError} from "@/server/api/context";
import {emptyBodySchema} from "@/server/api/schemas";
import {failure,json,optionalJson} from "@/server/api/http";
import {appUrl,stripeClient} from "@/server/billing/stripe";

export async function POST(request:Request){
  try{
    const context=await requireApiContext(request);
    emptyBodySchema.parse(await optionalJson(request));
    
    let customerId = context.workspace.stripeCustomerId;
    if(!customerId){
      const stripe = stripeClient();
      const customer = await stripe.customers.create({
        email: context.user.email,
        metadata: { workspaceId: context.workspace.id }
      });
      customerId = customer.id;
      await context.db.workspace.update({
        where: { id: context.workspace.id },
        data: { stripeCustomerId: customerId }
      });
    }

    const session=await stripeClient().billingPortal.sessions.create({
      customer:customerId,
      return_url:`${appUrl()}/app/billing`
    });
    return json({url:session.url});
  }catch(error){
    return failure(error)
  }
}
