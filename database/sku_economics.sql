
-- Table: SKUEconomics
CREATE TABLE SKUEconomics (
    id SERIAL PRIMARY KEY,
    amazon_store TEXT NOT NULL,
    start_date_pst_pdt DATE NOT NULL,
    end_date_pst_pdt DATE NOT NULL,
    MSKU TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    FBA_fulfillment_fees_total NUMERIC(10, 2),
    sponsored_products_charge_total NUMERIC(10, 2),
    monthly_inventory_storage_fee_total NUMERIC(10, 2),
    inbound_transportation_charge_total NUMERIC(10, 2)
);
