# Component 3 — Ownership Verification

GOX verifies a seller's claimed holding before the holding can pass the transaction gate. A holding has provenance evidence, authoritative-source verification, encumbrances, fraud flags, expiring attestations, and an available/unencumbered quantity.

## Verification lifecycle
1. Register a holding claim.
2. Attach evidence (registry/certificate/custodian/cap-table reference). GOX stores a digest for provenance.
3. Query an `OwnershipSourceAdapter`. The repository ships with a deterministic mock adapter; production deployments must connect authoritative registries, transfer agents, custodians or issuer records.
4. Calculate encumbered and available quantity, inspect fraud flags, and issue a time-limited attestation.
5. Before a trade proceeds, bind the approved compliance decision to the verified seller/security/holding and requested quantity.

A GOX attestation is evidence about verification performed by configured sources. It is not, by itself, a legal title registry or legal opinion.
