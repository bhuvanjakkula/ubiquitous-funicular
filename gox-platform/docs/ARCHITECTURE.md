# GOX Architecture
Identity -> Compliance -> Ownership Verification -> Programmable Ownership -> Global Cap Table -> Price Discovery -> Liquidity -> Coordinated DvP Settlement.

Prototype: modular monolith with zero external dependencies. Production target: PostgreSQL bounded-context schemas, Redis ephemeral state, Kafka-compatible event bus, outbox/inbox, idempotency, OpenTelemetry, secrets management, signed audit events and regulated provider adapters.

Security invariants: least privilege; encrypted evidence; versioned/reproducible compliance decisions; idempotent settlement/ownership mutations; signed callbacks/replay protection; no ownership transfer solely because an order matched.
