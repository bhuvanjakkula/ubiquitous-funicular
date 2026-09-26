-- GOX v0.6 Global Cap Table persistence model
CREATE TABLE IF NOT EXISTS cap_share_classes (
 id uuid PRIMARY KEY, issuer_id uuid NOT NULL, security_id text UNIQUE NOT NULL, name text NOT NULL,
 currency char(3) NOT NULL, authorized numeric(30,8) NOT NULL DEFAULT 0, reserved numeric(30,8) NOT NULL DEFAULT 0,
 par_value_minor bigint NOT NULL DEFAULT 0, rights jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cap_ledger_entries (
 id uuid PRIMARY KEY, type text NOT NULL CHECK(type IN ('ISSUE','TRANSFER','CANCEL','TREASURY')),
 issuer_id uuid NOT NULL, security_id text NOT NULL, from_owner_id text, to_owner_id text,
 quantity numeric(30,8) NOT NULL CHECK(quantity > 0), effective_at timestamptz NOT NULL,
 reference text, program_decision_id uuid, previous_hash text, entry_hash text UNIQUE NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cap_ledger_lookup ON cap_ledger_entries(issuer_id, security_id, effective_at);
CREATE TABLE IF NOT EXISTS cap_corporate_actions (
 id uuid PRIMARY KEY, issuer_id uuid NOT NULL, security_id text NOT NULL, type text NOT NULL,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb, effective_at timestamptz NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cap_reconciliations (
 id uuid PRIMARY KEY, issuer_id uuid NOT NULL, security_id text NOT NULL, source text NOT NULL,
 status text NOT NULL, differences jsonb NOT NULL DEFAULT '[]'::jsonb, source_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
