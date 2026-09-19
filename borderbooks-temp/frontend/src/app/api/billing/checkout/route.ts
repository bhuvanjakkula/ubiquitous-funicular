export const dynamic = 'force-dynamic';
import {z} from "zod";
import {requireApiContext} from "@/server/api/context";
import {failure,json,optionalJson} from "@/server/api/http";
import {appUrl,priceFor,stripeClient} from "@/server/billing/stripe";
const schema=z.object({plan:z.enum(["STUDIO","COMMERCE"])}).strict();
export async function POST(request:Request){try{const context=await requireApiContext(request),{plan}=schema.parse(await optionalJson(request)),stripe=stripeClient(),origin=appUrl(),session=await stripe.checkout.sessions.create({mode:"subscription",line_items:[{price:priceFor(plan),quantity:1}],phone_number_collection:{enabled:true},billing_address_collection:'required',success_url:`${origin}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/app/billing?billing=cancelled`,client_reference_id:context.workspace.id,metadata:{workspaceId:context.workspace.id,plan},subscription_data:{metadata:{workspaceId:context.workspace.id,plan}},...(context.workspace.stripeCustomerId?{customer:context.workspace.stripeCustomerId,customer_update:{address:'auto'}}:{customer_email:context.user.email})});return json({url:session.url});}catch(error){return failure(error)}}
