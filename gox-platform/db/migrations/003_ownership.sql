-- GOX v0.4 Component 3: Ownership Verification
CREATE TABLE ownership_holdings (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES identities(id), security_id uuid NOT NULL REFERENCES securities(id),
 quantity numeric(38,12) NOT NULL CHECK (quantity > 0), share_class text, certificate_ref text, registry_ref text,
 source_type text NOT NULL, status text NOT NULL DEFAULT 'PENDING', transferable boolean NOT NULL DEFAULT false,
 verified_at timestamptz, expires_at timestamptz, verification_reference text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX ownership_holdings_owner_security_idx ON ownership_holdings(owner_id, security_id);
CREATE TABLE ownership_evidence (
 id uuid PRIMARY KEY, holding_id uuid NOT NULL REFERENCES ownership_holdings(id), type text NOT NULL, reference text NOT NULL,
 digest text NOT NULL, issuer text, issued_at timestamptz, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL
);
CREATE TABLE ownership_encumbrances (
 id uuid PRIMARY KEY, holding_id uuid NOT NULL REFERENCES ownership_holdings(id), type text NOT NULL, quantity numeric(38,12),
 status text NOT NULL, reference text, details text, created_at timestamptz NOT NULL
);
CREATE TABLE ownership_attestations (
 id uuid PRIMARY KEY, holding_id uuid NOT NULL REFERENCES ownership_holdings(id), status text NOT NULL, provider text,
 reference text, confirmed_quantity numeric(38,12), available_quantity numeric(38,12), reasons jsonb NOT NULL DEFAULT '[]',
 evidence_digests jsonb NOT NULL DEFAULT '[]', verified_at timestamptz, expires_at timestamptz, created_at timestamptz NOT NULL
);
CREATE TABLE ownership_fraud_flags (
 id uuid PRIMARY KEY, holding_id uuid NOT NULL REFERENCES ownership_holdings(id), code text NOT NULL, severity text NOT NULL,
 status text NOT NULL, details text, created_at timestamptz NOT NULL
);
