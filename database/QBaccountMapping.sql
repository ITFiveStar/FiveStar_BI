
-- Table: QBAccountIDMapping
CREATE TABLE QBAccountIDMapping (
    id SERIAL PRIMARY KEY,
    statement_category TEXT NOT NULL,
    statement_pnl_items TEXT NOT NULL,
    pnl_account_name TEXT,
    pnl_account_id BIGINT,
    bs_account_name TEXT,
    bs_account_id BIGINT
);