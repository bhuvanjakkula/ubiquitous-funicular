# GOX Platform

Global Ownership Exchange (GOX) is an architecture/prototype for compliant private-market ownership workflows. It integrates eight domains: Identity, Compliance, Ownership Verification, Programmable Ownership, Global Cap Table, Price Discovery, Liquidity, and coordinated Delivery-versus-Payment Settlement.

## Current milestone — v0.2 Identity
Component 1 now includes individual/organization identities, roles, beneficial ownership, KYC/KYB/AML/accreditation cases, a verification-provider adapter, signed bearer-token/RBAC foundations, chained audit records, and a PostgreSQL migration. See `docs/IDENTITY.md`.

## Run
Requires Node.js 20+ and has no runtime npm dependencies.

```bash
npm test
npm start
```

Health: `GET http://localhost:3000/health`

For local protected calls, create a development token with `POST /v1/dev/tokens` and send it as `Authorization: Bearer <token>`.

## Important boundary
This repository is engineering infrastructure, not a licensed exchange, broker, custodian, transfer agent, KYC provider, bank, or legal registry. Mock verification, development tokens, in-memory persistence and prototype compliance rules must be replaced/validated with appropriate regulated providers, counsel and licenses before any real securities activity.

## v0.7 — Component 4: Programmable Ownership
Versioned ownership programs now enforce configurable lockups, jurisdiction and investor-type restrictions, transfer-size and concentration limits, and mandatory Compliance/Ownership gates. Each evaluation records a policy hash, input hash, rule-level explanation, and decision. Amendments create new versions; shareholder-right metadata and controlled corporate-action hooks are versioned with the program. See `docs/PROGRAMMABLE_OWNERSHIP.md` and `db/migrations/004_programmable_ownership.sql`.

## v0.7 — Component 6: Price Discovery

Component 6 adds provenance-aware price observations, best bid/ask and reference prices, staleness controls, executable quote construction, price-band review flags, auctions, price history, audit events, REST APIs and PostgreSQL migration `006_price_discovery.sql`. See `docs/PRICE_DISCOVERY.md`.

## v0.8 — Liquidity Network
Component 7 adds a proper order lifecycle, price-time matching with partial fills, RFQ/block workflows, venue/provider adapters, pre-trade gates, immutable trade hashes and integrity alerts. Matches remain `MATCHED_UNSETTLED`; legal/cash finality belongs to Component 8.

See `docs/LIQUIDITY_NETWORK.md` and `db/migrations/007_liquidity_network.sql`.


## v0.9 — DvP Settlement

Component 8 adds matched-trade settlement instructions, idempotent cash and securities adapter operations, reservations, coordinated delivery-versus-payment state transitions, timeout/reconciliation states, immutable settlement receipts, and cap-table posting only after both external legs report completion.

The bundled adapters are deterministic in-memory development adapters. Production deployments must replace them with appropriately regulated banking/payment, custody, transfer-agent or authoritative registry integrations. GOX does not treat an internal database write as external legal settlement finality.

### v0.9 flow

`MATCHED_UNSETTLED -> INSTRUCTED -> RESERVED -> PROCESSING -> SETTLED`

Ambiguous or timed-out outcomes transition to `RECONCILIATION_REQUIRED`.
