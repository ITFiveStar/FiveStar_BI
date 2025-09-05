
-- Table: FailedManufactureResult
CREATE TABLE FailedManufactureResult (
    id SERIAL PRIMARY KEY,
    manufacture_order_id INTEGER NOT NULL,
    SKU TEXT NOT NULL,
    product TEXT NOT NULL,
    manufacture_date DATE NOT NULL,
    failure_reason TEXT,
    UNIQUE (SKU, product, manufacture_date),
    FOREIGN KEY (SKU, product, manufacture_date) 
        REFERENCES ManufactureOrders(SKU, product, manufacture_date)
);

-- Trigger function: enforce uppercase for relevant columns
CREATE OR REPLACE FUNCTION enforce_uppercase_failed_manufacture_result()
RETURNS TRIGGER AS $$
BEGIN
    NEW.SKU := UPPER(NEW.SKU);
    NEW.product := UPPER(NEW.product);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_failed_manufacture_result_before_insert
BEFORE INSERT ON FailedManufactureResult
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_failed_manufacture_result();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_failed_manufacture_result_before_update
BEFORE UPDATE ON FailedManufactureResult
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_failed_manufacture_result();
