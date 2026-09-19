import {expect,test} from "@playwright/test";
import {join} from "node:path";

test.skip(!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY, "Clerk testing keys must be supplied through the environment");

test("uploads both fixtures, runs matching, and shows INV-1001 matched",async({page})=>{
  let uploadCount=0;
  await page.route("**/api/uploads",async route=>{if(route.request().method()!=="POST")return route.fallback();uploadCount++;await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({id:uploadCount===1?"invoice-upload":"payment-upload"})})});
  await page.route("**/api/match-runs",async route=>{if(route.request().method()!=="POST")return route.fallback();await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({id:"run-smoke"})})});
  await page.route("**/api/match-runs/run-smoke",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({id:"run-smoke",createdAt:"2026-08-31T00:00:00.000Z",parseErrors:[],links:[{id:"link-1",status:"PROPOSED",confidence:100,method:"EXACT_REF",flags:[],expectedMinor:"1000000",receivedMinor:"1000000",feeMinor:"0",fxDiffMinor:"0",explanation:"Exact invoice number INV-1001 and reference PO-8891 in description; amount EUR 10000.00 equal; value date 1 day after due.",invoice:{id:"inv-1",invoiceNumber:"INV-1001",customerName:"Acme GmbH",currency:"EUR",amountMinor:"1000000",rawJson:{}},txn:{id:"txn-1",vendorId:"TXN-01",postedAt:"2025-01-16T00:00:00.000Z",valueDate:"2025-01-16T00:00:00.000Z",currency:"EUR",amountMinor:"1000000",description:"Payment INV-1001 PO-8891",rawJson:{}}}]})}));
  await page.goto("/app/new");
  const inputs=page.locator('input[type="file"]');
  await inputs.nth(0).setInputFiles(join(process.cwd(),"tests","fixtures","invoices.csv"));
  await inputs.nth(1).setInputFiles(join(process.cwd(),"tests","fixtures","payouts.csv"));
  await page.getByRole("button",{name:"Run match"}).click();
  await expect(page).toHaveURL(/\/app\/runs\/run-smoke$/);
  const row=page.getByTestId("match-row-INV-1001");
  await expect(row).toBeVisible();
  await expect(row).toContainText("INV-1001");
  await expect(row).toHaveClass(/bucket-matched/);
});

test("shows the Commerce upgrade banner for a PLAN_LIMIT response",async({page})=>{
  let uploadCount=0;
  await page.route("**/api/uploads",async route=>{uploadCount++;await route.fulfill({status:201,contentType:"application/json",body:JSON.stringify({id:`upload-${uploadCount}`})})});
  await page.route("**/api/match-runs",route=>route.fulfill({status:402,contentType:"application/json",body:JSON.stringify({code:"PLAN_LIMIT",error:"Plan allows 2000 rows per run"})}));
  await page.goto("/app/new");
  const inputs=page.locator('input[type="file"]');
  await inputs.nth(0).setInputFiles(join(process.cwd(),"tests","fixtures","invoices.csv"));
  await inputs.nth(1).setInputFiles(join(process.cwd(),"tests","fixtures","payouts.csv"));
  await page.getByRole("button",{name:"Run match"}).click();
  await expect(page.locator("aside.upgrade-banner")).toContainText("over the Studio row limit");
  await expect(page.getByRole("button",{name:/Upgrade to Commerce/})).toBeVisible();
});
