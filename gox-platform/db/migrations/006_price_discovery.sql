-- GOX v0.7 Price Discovery persistence model
CREATE TABLE IF NOT EXISTS price_observations (
 id uuid PRIMARY KEY, security_id text NOT NULL, type text NOT NULL, side text,
 price_minor bigint NOT NULL CHECK (price_minor > 0), quantity numeric, currency char(3) NOT NULL,
 source text NOT NULL, source_ref text, observed_at timestamptz NOT NULL, expires_at timestamptz,
 confidence numeric NOT NULL DEFAULT 1, metadata jsonb NOT NULL DEFAULT '{}', provenance_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), created_by text NOT NULL
);
CREATE INDEX IF NOT EXISTS price_observations_security_time ON price_observations(security_id, observed_at DESC);
CREATE TABLE IF NOT EXISTS price_quotes (
 id uuid PRIMARY KEY, security_id text NOT NULL, side text NOT NULL, quantity numeric NOT NULL,
 price_minor bigint NOT NULL, currency char(3) NOT NULL, status text NOT NULL, valid_until timestamptz NOT NULL,
 reference_minor bigint, deviation_bps integer, flags jsonb NOT NULL DEFAULT '[]', quote_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), created_by text NOT NULL
);
CREATE TABLE IF NOT EXISTS price_auctions (
 id uuid PRIMARY KEY, security_id text NOT NULL, currency char(3) NOT NULL, opens_at timestamptz NOT NULL,
 closes_at timestamptz NOT NULL, minimum_quantity numeric NOT NULL DEFAULT 0, reserve_price_minor bigint,
 status text NOT NULL, result jsonb, created_at timestamptz NOT NULL DEFAULT now(), created_by text NOT NULL
);
CREATE TABLE IF NOT EXISTS price_auction_orders (
 id uuid PRIMARY KEY, auction_id uuid NOT NULL REFERENCES price_auctions(id), participant_id text NOT NULL,
 side text NOT NULL, quantity numeric NOT NULL, price_minor bigint NOT NULL, submitted_at timestamptz NOT NULL, created_by text NOT NULL
);
CREATE TABLE IF NOT EXISTS price_alerts (
 id uuid PRIMARY KEY, security_id text NOT NULL, type text NOT NULL, details jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), created_by text NOT NULL
);
