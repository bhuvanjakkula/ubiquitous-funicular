-- GOX Component 2: Compliance Engine
CREATE TABLE IF NOT EXISTS securities (
 id UUID PRIMARY KEY, issuer_id UUID NOT NULL, name TEXT NOT NULL, issuer_country CHAR(2) NOT NULL,
 classification TEXT NOT NULL, currency CHAR(3), metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS compliance_policies (
 id UUID PRIMARY KEY, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL,
 active_version_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS compliance_policy_versions (
 id UUID PRIMARY KEY, policy_id UUID NOT NULL REFERENCES compliance_policies(id), version INTEGER NOT NULL,
 status TEXT NOT NULL, rules JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(policy_id,version)
);
ALTER TABLE compliance_policies ADD CONSTRAINT compliance_active_version_fk FOREIGN KEY(active_version_id) REFERENCES compliance_policy_versions(id);
CREATE TABLE IF NOT EXISTS compliance_decisions (
 id UUID PRIMARY KEY, policy_id UUID NOT NULL REFERENCES compliance_policies(id), policy_version_id UUID NOT NULL REFERENCES compliance_policy_versions(id),
 buyer_id UUID NOT NULL, seller_id UUID NOT NULL, security_id UUID, action TEXT NOT NULL, outcome TEXT NOT NULL,
 reasons JSONB NOT NULL, rule_results JSONB NOT NULL, context_snapshot JSONB NOT NULL, review JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compliance_decisions_parties_idx ON compliance_decisions(buyer_id,seller_id,created_at DESC);
CREATE INDEX IF NOT EXISTS compliance_decisions_security_idx ON compliance_decisions(security_id,created_at DESC);
