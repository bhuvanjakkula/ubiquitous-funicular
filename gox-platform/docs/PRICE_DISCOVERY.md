# GOX Component 6 — Price Discovery

GOX v0.7 treats price discovery as a provenance-aware market-data domain, separate from order execution.

## Capabilities
- Bid, ask, reference, trade, valuation, and auction-clearing observations.
- SHA-256 provenance hashes binding source, source reference, timestamp and economic fields.
- Best bid/ask, midpoint and confidence-weighted reference price calculation.
- Explicit stale-price detection with configurable maximum age.
- Short-lived executable quote construction from current market observations.
- Configurable deviation bands that route anomalous quotes to `REVIEW` rather than claiming manipulation.
- Uniform-price auction discovery with demand/supply volume and imbalance.
- Price history and review-alert APIs.

## Safety and market-integrity boundary
A `PRICE_OUTSIDE_BAND` flag is a surveillance/review signal, not a finding of market manipulation. Production deployments should integrate regulated market-data sources, surveillance controls, venue rules and qualified legal/compliance review.

Price observations do not execute securities transactions. Component 7 (Liquidity) consumes approved pricing context and handles order/matching workflows.
