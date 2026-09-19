# BorderBooks

BorderBooks Matcher is a B2B reconciliation workspace that matches uploaded invoices with bank and payout transactions using deterministic, explainable rules.

## What it is — and is not

BorderBooks helps a bookkeeper review likely invoice receipts, short payments, overpayments, FX gaps, and money movements that remain unallocated. It creates reviewable workpapers and journal-label exports.

BorderBooks never moves money, scrapes banks, or gives tax or accounting advice. Account names in exports are labels only. Customers own their uploads; files may be deleted after the configured retention period, which defaults to 30 days. Customer statement and upload data is not used to train models.

## Run locally

1. Install packages with `pnpm install`.
2. Copy `.env.example` to `.env.local` and supply your PostgreSQL, Clerk, and Stripe configuration. Use real Clerk keys; do not add placeholder Clerk URLs.
3. Generate the Prisma client with `pnpm prisma generate`.
4. Apply committed database migrations with `pnpm prisma migrate deploy`.
5. Start Next.js with `pnpm dev`.

Quality commands:

- `pnpm test` runs the full Vitest unit suite.
- `pnpm test:match` runs only parser and frozen-matcher tests.
- `pnpm fixture:replay` parses both locked fixture files, runs the matcher, and exits with a failure if links, buckets, confidence floors, leftovers, or suggestions differ from the authorized golden file.
- `pnpm test:e2e` runs the Playwright smoke tests.
- `pnpm retention:uploads` deletes local upload bytes older than `FILE_RETENTION_DAYS` while retaining database and match history.

## Environment

- `DATABASE_URL`: PostgreSQL connection URL.
- `NEXT_PUBLIC_APP_URL`: public application origin, such as `http://localhost:3000`.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key.
- `CLERK_SECRET_KEY`: Clerk server key.
- `STRIPE_SECRET_KEY`: Stripe server key.
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret.
- `STRIPE_PRICE_STUDIO`: Stripe Studio monthly price ID.
- `STRIPE_PRICE_COMMERCE`: Stripe Commerce monthly price ID.
- `FILE_RETENTION_DAYS`: uploaded-file retention period in days; the default is 30.

Do not commit `.env.local` or real credentials.

## Matching policy v1

BorderBooks applies one frozen, deterministic policy to every run. It never moves money and its matches and export labels are not accounting advice.

### One invoice and one receipt

An automatic match always joins one invoice to one incoming transaction. Once either record is used, it cannot be used again in that run. BorderBooks never automatically combines two invoices into one payout. A possible two-invoice batch may be shown for review as a suggestion only.

### Dates

The matcher uses the transaction value date when supplied, otherwise its posted date. The normal window starts seven days before the invoice due date and ends fourteen days after it. Workspace settings may widen that window for a particular run.

### Amounts and short payments

Money is compared in integer minor units and only in the stated currency. An exact receipt is equal. A smaller positive receipt is short; a larger receipt is over.

For same-currency receipts, the fee allowance is 30 basis points of the invoice amount, rounded up, with a floor of 25 major currency units and a cap of 50. For example, the floor is USD 25.00 and the cap is USD 50.00. A shortfall inside that allowance can be treated as a likely fee-sized difference. A larger shortfall remains open and is clearly flagged for review. No FX rate is invented.

### Identifiers and automatic links

Invoice numbers and references are compared as whole identifiers after consistent spacing and dash normalization. A strong invoice identifier can make an automatic link when the receipt is incoming, within the date window, and not wildly different in amount—even when its displayed confidence is below the normal score threshold. Without a strong identifier, an automatic link requires the frozen score threshold, the same currency, the date window, and an equal or fee-sized short amount.

Confidence is the raw frozen score limited to 0–100. The matcher does not raise confidence merely because a strong-identifier link qualified.

### Overpayments and outgoing money

An overpayment stays linked to its invoice with an `OVER` flag so the residual remains visible. Bank fees, refunds, and other negative transactions are never paired with invoices; they remain in unallocated outgoing.

Incoming transactions without an automatic link remain in unallocated incoming. Invoices without an automatic link remain listed as unmatched invoices rather than becoming a money bucket.

### Suggestions and reasons

Suggestions are review aids, not hard links. Every automatic link includes a complete “Why” sentence describing the identifier evidence, amount comparison, and date comparison so a bookkeeper can understand the result without inspecting the matching code.
