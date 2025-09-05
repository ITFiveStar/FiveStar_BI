
-- Table: FailedCOGS
CREATE TABLE FailedCOGS (
    id SERIAL PRIMARY KEY, -- Self-incrementing primary key
    sales_record_id TEXT NOT NULL,
    sales_date DATE NOT NULL,
    SKU TEXT NOT NULL,
    quantity_sold INTEGER NOT NULL,
    failed_quantity INTEGER NOT NULL,
    failure_reason TEXT,
    FOREIGN KEY (sales_record_id, SKU) REFERENCES SalesRecords(sales_record_id, SKU)
);

-- Trigger function: enforce uppercase
CREATE OR REPLACE FUNCTION enforce_uppercase_failed_cogs()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sales_record_id := UPPER(NEW.sales_record_id);
    NEW.SKU := UPPER(NEW.SKU);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_failed_cogs_before_insert
BEFORE INSERT ON FailedCOGS
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_failed_cogs();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_failed_cogs_before_update
BEFORE UPDATE ON FailedCOGS
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_failed_cogs();
