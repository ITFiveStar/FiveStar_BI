
-- Table: AmazonStatements
CREATE TABLE AmazonStatements (
    id SERIAL PRIMARY KEY,
    settlement_id TEXT NOT NULL,
    settlement_start_date_utc TIMESTAMP,
    settlement_start_date_pst_pdt TIMESTAMP,
    settlement_end_date_utc TIMESTAMP,
    settlement_end_date_pst_pdt TIMESTAMP,
    deposit_date_utc TIMESTAMP,
    deposit_date_pst_pdt TIMESTAMP,
    total_amount NUMERIC(10, 2),
    currency TEXT,
    transaction_type TEXT,
    order_id TEXT,
    marketplace_name TEXT,
    amount_type TEXT,
    amount_description TEXT,
    amount NUMERIC(10, 2),
    posted_date_time_utc TIMESTAMP,
    posted_date_time_pst_pdt TIMESTAMP,
    sku TEXT,
    quantity_purchased INTEGER
);
