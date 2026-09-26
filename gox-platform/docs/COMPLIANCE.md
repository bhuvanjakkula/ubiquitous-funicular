# Component 2 — GOX Compliance Engine

GOX Compliance is a versioned, explainable policy-evaluation service. It consumes Identity records and security metadata and produces immutable-style decision records containing the exact policy version, rule results, reasons, and a context snapshot used at evaluation time.

## Model

- **Security**: issuer, issuer jurisdiction, classification and metadata.
- **Policy**: named policy container.
- **Policy version**: immutable rule set; only an activated version is evaluated.
- **Decision**: ALLOW, DENY or REVIEW plus per-rule explanations.
- **Manual review**: authorized compliance/admin actors may resolve REVIEW decisions to ALLOW/DENY with a reason.

Supported prototype predicates are identity verification, country allow/block lists, required roles, approved verification-case types, security classification and transaction action. Rules are data, not executable user code.

## Important boundary

The sample policies in this repository are engineering examples only. They do not encode or assert the securities law of any jurisdiction. Production deployments must source, validate, approve and version jurisdiction-specific rules with qualified legal/compliance professionals and regulated partners.
