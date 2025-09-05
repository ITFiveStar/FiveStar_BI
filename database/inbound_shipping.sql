
-- Table: AmazonInboundShipping
CREATE TABLE AmazonInboundShipping (
    id SERIAL PRIMARY KEY,
    shipment_name TEXT NOT NULL,
    shipment_id TEXT NOT NULL,
    created_pst_pdt TIMESTAMP,
    last_updated_pst_pdt TIMESTAMP,
    ship_to TEXT,
    units_expected INTEGER,
    units_located INTEGER,
    status TEXT,
    amazon_partnered_carrier_cost NUMERIC(10, 2),
    currency TEXT,
    MSKU TEXT
);
