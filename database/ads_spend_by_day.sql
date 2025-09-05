
-- Table: Amazon Sponsored Products Spend by SKU & Day
CREATE TABLE AdsSpendByDay (
    id SERIAL PRIMARY KEY,
    date_by_day DATE NOT NULL,
    sku TEXT NOT NULL,
    spend NUMERIC(10, 2)
);

