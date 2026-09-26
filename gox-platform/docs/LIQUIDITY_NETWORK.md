# Component 7 — Liquidity Network

GOX v0.8 introduces an execution layer that remains deliberately separate from settlement/legal title transfer.

## Capabilities
- LIMIT and MARKET order lifecycle with GTC semantics, partial fills and cancellation.
- Price-time priority order books and immutable trade hashes.
- Pre-trade gate abstraction; the default prototype validates the security and seller cap-table balance.
- RFQ/block workflow with invited liquidity providers, minimum fills and quote expiry.
- Venue/provider registry for later broker/ATS/MTF/exchange adapters.
- Integrity controls for self-trades and extreme price deviations.
- Every match is `MATCHED_UNSETTLED`; Component 8 owns DvP settlement/finality.

## Production integration contract
The `preTradeGate` constructor hook is where Components 1–6 should be composed into jurisdiction-specific identity, compliance, ownership, programmable-transfer, cap-table and price-integrity checks. The included default is intentionally conservative and is not a regulatory determination.
