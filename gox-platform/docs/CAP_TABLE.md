# GOX Global Cap Table — v0.6

Component 5 is an append-only ownership accounting layer for GOX. It models share classes, issuance, transfers, cancellation, treasury holdings, point-in-time balances, fully diluted snapshots, corporate-action records, and reconciliation with an external authoritative source.

## Integrity and legal boundary
Ledger entries form a hash chain and every mutation emits an audit event. A GOX cap-table record is **not automatically the legally authoritative shareholder register**. Production deployments must reconcile with the issuer's legally recognized registry, transfer agent, custodian, depository, or equivalent authority for the applicable jurisdiction.

## Transfer gate
New `/v1/cap-table/transfers` entries require an `ALLOW` decision from Component 4. Component 4 is itself designed to consume Compliance and Ownership-verification gates, preserving the intended chain: Identity → Compliance → Ownership Verification → Programmable Ownership → Cap Table.

## Reconciliation
`POST /v1/cap-table/reconcile` compares internal balances to holdings supplied by an authoritative-source adapter and records MATCH/MISMATCH plus per-owner deltas. The prototype accepts adapter output as input; production adapters must authenticate and verify source provenance.
