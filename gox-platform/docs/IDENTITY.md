# GOX Identity — Component 1

GOX Identity is the canonical participant identity boundary consumed by Components 2–8.

## Domain model
- `Identity`: individual or organization, country, roles, lifecycle status and verification level.
- `Organization`: legal identity metadata linked 1:1 to an organization identity.
- `BeneficialOwner`: links an individual identity to an organization with ownership/control metadata.
- `VerificationCase`: KYC, KYB, AML or accreditation workflow with an external provider reference.

## Verification policy in v0.2
Individuals reach `VERIFIED/STANDARD` after approved KYC + AML cases. Organizations require KYB + AML. A rejected case rejects the identity. These are demonstration workflow defaults, not jurisdiction-specific legal rules.

## Security boundary
Administrative verification decisions and organization ownership mutations require a signed bearer token with `COMPLIANCE` or `ADMIN`. `/v1/dev/tokens` exists only for local development and must be disabled/replaced by an OIDC/OAuth authorization server in production.

## Provider boundary
`MockVerificationProvider` demonstrates the adapter contract. Production deployments should implement adapters for selected KYC/KYB/AML vendors without storing raw identity evidence in the general application database.

## Persistence
`db/migrations/001_identity.sql` defines the PostgreSQL schema. The executable prototype continues to use `InMemoryIdentityRepository` so it has zero runtime dependencies; the next persistence increment implements the same repository contract with PostgreSQL and transaction/outbox support.
