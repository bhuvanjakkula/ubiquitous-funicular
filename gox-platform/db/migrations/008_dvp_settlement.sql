-- GOX v0.9 DvP settlement persistence model (PostgreSQL)
CREATE TABLE IF NOT EXISTS settlement_instructions (
  id uuid PRIMARY KEY, trade_id uuid NOT NULL UNIQUE, trade_hash text NOT NULL,
  issuer_id text NOT NULL, security_id text NOT NULL, buyer_id text NOT NULL, seller_id text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0), price_minor bigint NOT NULL CHECK (price_minor > 0),
  cash_amount_minor numeric NOT NULL CHECK (cash_amount_minor > 0), currency text NOT NULL,
  status text NOT NULL, cash_status text NOT NULL, securities_status text NOT NULL,
  instruction_hash text NOT NULL, timeout_at timestamptz NOT NULL, cap_table_entry_id uuid,
  failure_reason text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS settlement_leg_events (
  id uuid PRIMARY KEY, settlement_id uuid NOT NULL REFERENCES settlement_instructions(id), leg text NOT NULL,
  operation text NOT NULL, idempotency_key text NOT NULL UNIQUE, external_ref text, status text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS settlement_receipts (
  id uuid PRIMARY KEY, settlement_id uuid NOT NULL UNIQUE REFERENCES settlement_instructions(id),
  trade_id uuid NOT NULL, instruction_hash text NOT NULL, cash_external_ref text NOT NULL,
  securities_external_ref text NOT NULL, cap_table_entry_id uuid NOT NULL, receipt_hash text NOT NULL,
  settled_at timestamptz NOT NULL
);
