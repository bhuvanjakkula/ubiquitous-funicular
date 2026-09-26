# GOX Platform — API Reference

The Global Ownership Exchange (GOX) exposes RESTful endpoints for private market lifecycle operations with zero external dependencies.

Base URL: `http://localhost:3000`

---

## 1. System Health & Executive Overview

### `GET /health`
Returns service status and the list of active architectural modules.

### `GET /v1/overview`
Aggregated platform metrics: total participants, verified entities, active securities, open orders, executed trades, settled notional volume, and cryptographic audit chain validity.

---

## 2. Identity & Accreditation (Pillar 01)

### `GET /v1/participants`
List all registered market participants and institutional investors.

### `POST /v1/participants`
Register a new market participant.
```json
{
  "legalName": "Sequoia Private Secondary SPV",
  "entityType": "INSTITUTION",
  "country": "US",
  "accreditationStatus": "QUALIFIED_PURCHASER",
  "riskTier": "LOW"
}
```

### `POST /v1/participants/:id/verify`
Attest and verify KYC/KYB identity for a participant.

### `POST /v1/participants/:id/flag`
Flag a participant for AML / suspicious velocity.

---

## 3. Compliance Engine (Pillar 02)

### `POST /v1/compliance/evaluate`
Legacy 2-party identity evaluation (`buyerVerified`, `sellerVerified`).

### `POST /v1/compliance/evaluate-trade`
Full institutional pre-trade compliance verification across investor accreditation, jurisdictional sanction filters, lockup expiry, and position limits.
```json
{
  "buyerId": "PART-APOLLO",
  "sellerId": "PART-SEQUOIA",
  "securityId": "SPCX-N",
  "quantity": 5000,
  "rulePack": "GLOBAL_INSTITUTIONAL"
}
```

---

## 4. Ownership Verification & Securities Master (Pillar 03)

### `GET /v1/securities`
List all registered private securities and share classes.

### `POST /v1/securities`
Register a new private corporate equity class.
```json
{
  "symbol": "ANTH",
  "name": "Anthropic Series C Growth Shares",
  "issuerId": "ISS-ANTHROPIC",
  "shareClass": "Series C Preferred",
  "authorizedShares": 25000000,
  "parValueMinor": 100,
  "currency": "USD"
}
```

### `GET /v1/holdings`
Query ownership holdings. Query parameters: `?ownerId=...` or `?securityId=...`.

### `POST /v1/holdings`
Create a certified share holding with SHA-256 digital certificate proof.

### `POST /v1/holdings/:id/verify`
Transfer agent verification of holding authenticity.

---

## 5. Programmable Ownership Policies (Pillar 04)

### `GET /v1/policies`
List programmable restrictions across all securities.

### `POST /v1/policies`
Attach smart transfer rules to a private asset.
```json
{
  "securityId": "SPCX-N",
  "allowedCountries": ["US", "GB", "SG", "DE", "CH", "IN"],
  "blockedCountries": ["KP", "IR", "RU"],
  "lockupUntil": null,
  "maxPerInvestor": 500000,
  "requiresBoardApproval": true,
  "rofrRequired": false,
  "accreditedOnly": true
}
```

---

## 6. Global Cap Table (Pillar 05)

### `GET /v1/cap-table`
Returns current equity cap table ledger. Optional query: `?issuerId=...`.

### `GET /v1/cap-table/breakdown`
Returns percentage ownership distribution per shareholder.

### `POST /v1/cap-table`
Directly set or issue cap table shares.

### `POST /v1/cap-table/transfer`
Atomic secondary equity transfer between shareholders.
```json
{
  "issuerId": "ISS-SPACEX",
  "securityId": "SPCX-N",
  "from": "PART-SEQUOIA",
  "to": "PART-APOLLO",
  "quantity": 2500
}
```

---

## 7. Price Discovery & Market Depth (Pillar 06)

### `GET /v1/pricing/stats/:securityId`
Returns best bid, best ask, mid-market price, bid/ask spread, and VWAP (Volume-Weighted Average Price).

### `GET /v1/depth/:securityId`
Level 2 order book depth ladder with cumulative volumes for bids and asks.

---

## 8. Liquidity & Matching Engine (Pillar 07)

### `GET /v1/orders`
List orders in the order book. Optional query: `?securityId=...`.

### `POST /v1/orders`
Place a Limit/Market Buy or Sell order (requires KYC verified participant).
```json
{
  "participantId": "PART-APOLLO",
  "securityId": "SPCX-N",
  "side": "BUY",
  "quantity": 5000,
  "priceMinor": 11400
}
```

### `POST /v1/orders/:id/cancel`
Cancel an open order.

### `GET /v1/matches/:securityId`
Executes continuous price-time matching algorithm and returns crossed trade.

### `GET /v1/trades`
Returns matched trade execution history.

---

## 9. Coordinated DvP Settlement (Pillar 08)

### `GET /v1/settlements`
List all Delivery-versus-Payment orchestration records.

### `POST /v1/settlements`
Initialize a DvP settlement state machine for a matched trade.

### `POST /v1/settlements/:id/confirm/cash`
Confirms the audited banking escrow cash deposit leg.

### `POST /v1/settlements/:id/confirm/asset`
Confirms the custody registry asset freeze leg.

### `POST /v1/settlements/:id/settle-atomic`
Executes atomic dual-leg confirmation, reconciles cap table equity ledger, marks state as `SETTLED`, and outputs cryptographic SHA-256 finality receipt.

---

## 10. Audit Chain & Simulator

### `GET /v1/audit`
Full chronological Merkle/hash-chained event stream.

### `GET /v1/audit/verify`
Cryptographically verifies integrity of all blocks in the SHA-256 chain.

### `POST /v1/simulator/run-flow`
Executes an institutional secondary deal end-to-end across all 8 components in a single call.

### `POST /v1/simulator/reset`
Resets the platform to genesis state with default seed data.
