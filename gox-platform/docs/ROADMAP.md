# Roadmap
1. Identity: auth/RBAC, KYC/KYB adapter, beneficial owners, screening hooks, encrypted evidence, consent/audit.
2. Compliance: policy DSL, jurisdiction/security/investor facts, manual review, counsel-approved rule packs.
3. Ownership: issuer/security master, registry evidence, encumbrances, provenance/reconciliation.
4. Programmable ownership: transfer policies, rights, lockups, corporate actions, signed policy versions.
5. Cap table: classes, issuances, transfers, cancellations, convertibles, snapshots, registry adapters.
6. Pricing: RFQ, auctions, indicative marks, book, valuation inputs, stale-price controls.
7. Liquidity: order lifecycle, matching, negotiation, venue/broker adapters, surveillance hooks.
8. Settlement: DvP orchestration, cash/custody adapters, escrow, retries, reconciliation, finality evidence.
Cross-cutting: threat modeling, fraud/risk, privacy/data residency, observability, DR, pen tests, legal/regulatory review and operational runbooks.


## v0.6 completed
Component 5 Global Cap Table: share classes, ledger, issuance, transfer, cancellation, treasury, snapshots, fully diluted totals, corporate actions, reconciliation. Next: Component 6 Price Discovery.

## v0.8 — Component 7: Liquidity Network (implemented)
- Order lifecycle, price-time matching and partial fills
- RFQ/block-trade workflow
- Venue/provider adapter registry
- Pre-trade gate abstraction and seller-balance check
- Immutable matched-trade records and market-integrity alerts
- PostgreSQL reference migration and REST endpoints

Next: v0.9 Component 8 — coordinated DvP settlement, cash/asset leg adapters, idempotency, reconciliation, failure recovery and settlement finality states.
