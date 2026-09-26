# Component 4 — Programmable Ownership

GOX represents transfer restrictions and shareholder mechanics as versioned, auditable ownership programs. These programs are software policy objects; they do not by themselves replace governing corporate documents, securities law, a transfer agent, custodian, or an authoritative legal register.

## Evaluation gates
Programs can express lockups, allowed/blocked buyer jurisdictions, investor types, minimum/maximum transfer quantities, per-investor concentration limits, required compliance decisions, and verified-ownership requirements. Every evaluation records program version, policy hash, input hash, individual rule results, and the resulting ALLOW/DENY/REVIEW outcome.

## Amendments and rights
Amendments create a new immutable version and supersede the previous active version. Shareholder-right metadata and enabled corporate-action hooks are versioned with the program. Corporate actions are recorded only when their hook is enabled.

## Integration order
Identity -> Compliance -> Ownership Verification -> Programmable Ownership -> Cap Table -> Pricing -> Liquidity -> Settlement.
