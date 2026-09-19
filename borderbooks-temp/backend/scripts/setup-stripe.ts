import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const secretKeyMatch = envContent.match(/STRIPE_SECRET_KEY=(sk_test_[A-Za-z0-9_]+)/);

if (!secretKeyMatch) {
  console.error("No STRIPE_SECRET_KEY found in .env.local");
  process.exit(1);
}

const stripe = new Stripe(secretKeyMatch[1], { apiVersion: '2023-10-16' as any });

async function setup() {
  const studioProduct = await stripe.products.create({ name: 'Studio Plan' });
  const studioPrice = await stripe.prices.create({
    product: studioProduct.id,
    unit_amount: 2900,
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  const commerceProduct = await stripe.products.create({ name: 'Commerce Plan' });
  const commercePrice = await stripe.prices.create({
    product: commerceProduct.id,
    unit_amount: 7900,
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  let newEnv = envContent;
  if (/STRIPE_PRICE_STUDIO=/.test(newEnv)) {
    newEnv = newEnv.replace(/STRIPE_PRICE_STUDIO=.*/, `STRIPE_PRICE_STUDIO=${studioPrice.id}`);
  } else {
    newEnv += `\nSTRIPE_PRICE_STUDIO=${studioPrice.id}`;
  }

  if (/STRIPE_PRICE_COMMERCE=/.test(newEnv)) {
    newEnv = newEnv.replace(/STRIPE_PRICE_COMMERCE=.*/, `STRIPE_PRICE_COMMERCE=${commercePrice.id}`);
  } else {
    newEnv += `\nSTRIPE_PRICE_COMMERCE=${commercePrice.id}`;
  }

  fs.writeFileSync(envPath, newEnv);
  console.log('Stripe prices created and .env.local updated successfully.');
}

setup().catch(console.error);
