BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS identities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL CHECK(type IN ('INDIVIDUAL','ORGANIZATION')),
 country char(2) NOT NULL, display_name text, roles text[] NOT NULL DEFAULT ARRAY['INVESTOR'],
 status text NOT NULL DEFAULT 'PENDING', verification_level text NOT NULL DEFAULT 'NONE',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), identity_id uuid UNIQUE NOT NULL REFERENCES identities(id),
 legal_name text NOT NULL, registration_number text NOT NULL, jurisdiction char(2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(jurisdiction, registration_number)
);
CREATE TABLE IF NOT EXISTS beneficial_owners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
 identity_id uuid NOT NULL REFERENCES identities(id), ownership_percent numeric(5,2) NOT NULL CHECK(ownership_percent>0 AND ownership_percent<=100),
 control_person boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,identity_id)
);
CREATE TABLE IF NOT EXISTS verification_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), identity_id uuid NOT NULL REFERENCES identities(id), type text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING', provider text, provider_case_id text, reason text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_identity ON verification_cases(identity_id);
COMMIT;
