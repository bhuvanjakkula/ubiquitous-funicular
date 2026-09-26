CREATE TABLE IF NOT EXISTS ownership_programs (
  id UUID PRIMARY KEY, security_id TEXT NOT NULL, issuer_id UUID, version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','SUPERSEDED','REVOKED')),
  effective_from TIMESTAMPTZ NOT NULL, effective_until TIMESTAMPTZ,
  rules JSONB NOT NULL, shareholder_rights JSONB NOT NULL DEFAULT '{}'::jsonb,
  corporate_action_hooks JSONB NOT NULL DEFAULT '[]'::jsonb, policy_hash TEXT NOT NULL,
  supersedes UUID, created_at TIMESTAMPTZ NOT NULL, created_by TEXT NOT NULL,
  UNIQUE(security_id, version)
);
CREATE TABLE IF NOT EXISTS ownership_program_decisions (
  id UUID PRIMARY KEY, security_id TEXT NOT NULL, program_id UUID, program_version INTEGER,
  policy_hash TEXT, decision TEXT NOT NULL CHECK (decision IN ('ALLOW','DENY','REVIEW')),
  results JSONB NOT NULL, input_hash TEXT NOT NULL, evaluated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS corporate_actions (
  id UUID PRIMARY KEY, security_id TEXT NOT NULL, program_id UUID NOT NULL, program_version INTEGER NOT NULL,
  type TEXT NOT NULL, payload JSONB NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, created_by TEXT NOT NULL
);
