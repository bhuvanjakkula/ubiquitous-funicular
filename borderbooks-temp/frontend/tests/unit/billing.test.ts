import Stripe from "stripe";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {applyStripeEvent} from "../../src/server/billing/stripe";

const routeDb=vi.hoisted(()=>({findFirst:vi.fn(),update:vi.fn()}));
vi.mock("@/server/db/client",()=>({db:{workspace:{findFirst:routeDb.findFirst,update:routeDb.update}}}));
import {POST as stripeWebhook} from "@/app/api/webhooks/stripe/route";

function database(workspace:{id:string}|null={id:"workspace-1"}){return{workspace:{findFirst:vi.fn().mockResolvedValue(workspace),update:vi.fn().mockResolvedValue({})}}}
const event=(type:string,object:unknown)=>({type,data:{object}}) as Stripe.Event;

describe("Task 8 Stripe plan synchronization",()=>{
  beforeEach(()=>{vi.clearAllMocks();process.env.STRIPE_SECRET_KEY="sk_test_borderbooks_fixture";process.env.STRIPE_WEBHOOK_SECRET="whsec_fixture";process.env.STRIPE_PRICE_COMMERCE="price_commerce";});
  it("sets checkout workspace identifiers and Commerce plan",async()=>{const db=database();expect(await applyStripeEvent(db,event("checkout.session.completed",{client_reference_id:"workspace-1",metadata:{workspaceId:"workspace-1",plan:"COMMERCE"},customer:"cus_1",subscription:"sub_1"}))).toBe(true);expect(db.workspace.update).toHaveBeenCalledWith({where:{id:"workspace-1"},data:{plan:"COMMERCE",stripeCustomerId:"cus_1",stripeSubscriptionId:"sub_1"}})});
  it("maps an active subscription price to Commerce",async()=>{process.env.STRIPE_PRICE_COMMERCE="price_commerce";const db=database();await applyStripeEvent(db,event("customer.subscription.updated",{id:"sub_1",status:"active",metadata:{workspaceId:"workspace-1"},customer:"cus_1",items:{data:[{price:{id:"price_commerce"}}]}}));expect(db.workspace.update).toHaveBeenCalledWith({where:{id:"workspace-1"},data:{plan:"COMMERCE",stripeCustomerId:"cus_1",stripeSubscriptionId:"sub_1"}})});
  it("returns a deleted subscription to Studio",async()=>{const db=database();await applyStripeEvent(db,event("customer.subscription.deleted",{id:"sub_1",status:"canceled",metadata:{},customer:"cus_1",items:{data:[{price:{id:"price_commerce"}}]}}));expect(db.workspace.findFirst).toHaveBeenCalled();expect(db.workspace.update).toHaveBeenCalledWith({where:{id:"workspace-1"},data:{plan:"STUDIO",stripeCustomerId:"cus_1",stripeSubscriptionId:null}})});
  it("ignores unrelated webhook events",async()=>{const db=database();expect(await applyStripeEvent(db,event("invoice.created",{}))).toBe(false);expect(db.workspace.update).not.toHaveBeenCalled()});
  it("rejects an invalid webhook signature",async()=>{const response=await stripeWebhook(new Request("http://localhost/api/webhooks/stripe",{method:"POST",headers:{"stripe-signature":"invalid"},body:"{}"}));expect(response.status).toBe(400);expect(await response.json()).toMatchObject({code:"INVALID_SIGNATURE"});});
  it("applies a signed Commerce subscription fixture",async()=>{routeDb.update.mockResolvedValue({});const payload=JSON.stringify({id:"evt_fixture",object:"event",api_version:"2025-08-27.basil",created:1,data:{object:{id:"sub_1",object:"subscription",status:"active",metadata:{workspaceId:"workspace-1"},customer:"cus_1",items:{data:[{price:{id:"price_commerce"}}]}}},livemode:false,pending_webhooks:0,request:null,type:"customer.subscription.updated"}),signature=Stripe.webhooks.generateTestHeaderString({payload,secret:"whsec_fixture"}),response=await stripeWebhook(new Request("http://localhost/api/webhooks/stripe",{method:"POST",headers:{"stripe-signature":signature},body:payload}));expect(response.status).toBe(200);expect(routeDb.update).toHaveBeenCalledWith({where:{id:"workspace-1"},data:{plan:"COMMERCE",stripeCustomerId:"cus_1",stripeSubscriptionId:"sub_1"}});});
});
