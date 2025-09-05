
-- Table: COGS
CREATE TABLE COGS (
    id SERIAL PRIMARY KEY, -- Self-incrementing primary key
    sales_record_id TEXT NOT NULL,
    sales_date DATE NOT NULL,
    SKU TEXT NOT NULL,
    quantity_sold INTEGER NOT NULL,
    result_id INTEGER NOT NULL,
    manufacture_batch INTEGER NOT NULL,
    product TEXT NOT NULL,
    fulfilled_by_PO TEXT NOT NULL,
    COGS NUMERIC(15, 2) NOT NULL,
    -- FOREIGN KEY (result_id, manufacture_batch, fulfilled_by_PO, product) 
    --     REFERENCES ManufactureResult(manufacture_order_id, manufacture_batch, fulfilled_by_PO, product),
    FOREIGN KEY (sales_record_id, SKU) REFERENCES SalesRecords(sales_record_id, SKU)
);

-- Trigger function: enforce uppercase
CREATE OR REPLACE FUNCTION enforce_uppercase_cogs()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sales_record_id := UPPER(NEW.sales_record_id);
    NEW.SKU := UPPER(NEW.SKU);
    NEW.product := UPPER(NEW.product);
    NEW.fulfilled_by_PO := UPPER(NEW.fulfilled_by_PO);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_cogs_before_insert
BEFORE INSERT ON COGS
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_cogs();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_cogs_before_update
BEFORE UPDATE ON COGS
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_cogs();
