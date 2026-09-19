import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const secretKeyMatch = envContent.match(/STRIPE_SECRET_KEY=(sk_test_[A-Za-z0-9_]+)/);
const studioPriceMatch = envContent.match(/STRIPE_PRICE_STUDIO=(price_[A-Za-z0-9_]+)/);

if (!secretKeyMatch || !studioPriceMatch) {
  console.error("Missing keys");
  process.exit(1);
}

const stripe = new Stripe(secretKeyMatch[1], { apiVersion: '2023-10-16' as any });

async function testSession() {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: studioPriceMatch[1], quantity: 1 }],
      phone_number_collection: { enabled: true },
      billing_address_collection: 'required',
      success_url: `http://localhost:3000/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/app/billing?billing=cancelled`,
      client_reference_id: "test_workspace_id",
      metadata: { workspaceId: "test_workspace_id", plan: "STUDIO" },
      subscription_data: { metadata: { workspaceId: "test_workspace_id", plan: "STUDIO" } },
      customer_email: "test@example.com"
    });
    console.log("Success:", session.url);
  } catch (err) {
    console.error("Stripe Error:", err);
  }
}

testSession();
