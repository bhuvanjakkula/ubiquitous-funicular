-- GOX v0.8 Liquidity Network. PostgreSQL reference schema.
CREATE TABLE IF NOT EXISTS liquidity_venues (
 id uuid PRIMARY KEY, name text NOT NULL, type text NOT NULL, status text NOT NULL,
 capabilities jsonb NOT NULL DEFAULT '[]', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS liquidity_orders (
 id uuid PRIMARY KEY, client_order_id text, participant_id uuid NOT NULL, issuer_id uuid, security_id text NOT NULL,
 side text NOT NULL CHECK (side IN ('BUY','SELL')), order_type text NOT NULL CHECK (order_type IN ('LIMIT','MARKET')),
 quantity numeric NOT NULL CHECK(quantity>0), remaining_quantity numeric NOT NULL CHECK(remaining_quantity>=0), price_minor bigint,
 currency char(3) NOT NULL, time_in_force text NOT NULL, status text NOT NULL, venue_id text NOT NULL,
 gate jsonb NOT NULL DEFAULT '{}', order_hash text NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS liquidity_orders_book_idx ON liquidity_orders(security_id,status,side,price_minor,created_at);
CREATE TABLE IF NOT EXISTS liquidity_trades (
 id uuid PRIMARY KEY, security_id text NOT NULL, issuer_id uuid, buy_order_id uuid, sell_order_id uuid,
 buyer_id uuid NOT NULL, seller_id uuid NOT NULL, quantity numeric NOT NULL, price_minor bigint NOT NULL,
 currency char(3) NOT NULL, status text NOT NULL, venue_id text NOT NULL, trade_hash text NOT NULL, matched_at timestamptz NOT NULL,
 integrity_flags jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS liquidity_rfqs (
 id uuid PRIMARY KEY, requester_id uuid NOT NULL, security_id text NOT NULL, side text NOT NULL,
 quantity numeric NOT NULL, currency char(3) NOT NULL, minimum_fill numeric NOT NULL DEFAULT 0,
 expires_at timestamptz NOT NULL, status text NOT NULL, invited_providers jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS liquidity_rfq_quotes (
 id uuid PRIMARY KEY, rfq_id uuid NOT NULL REFERENCES liquidity_rfqs(id), provider_id uuid NOT NULL,
 price_minor bigint NOT NULL, quantity numeric NOT NULL, valid_until timestamptz NOT NULL, venue_id text, created_at timestamptz NOT NULL
);
