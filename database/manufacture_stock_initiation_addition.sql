
-- Table: StockInitiationAddition
CREATE TABLE StockInitiationAddition (
    result_id SERIAL PRIMARY KEY,
    manufacture_order_id INTEGER DEFAULT -1 NOT NULL,
    manufacture_batch INTEGER DEFAULT -1 NOT NULL,
    SKU TEXT NOT NULL,
    product TEXT DEFAULT 'initiation/addition' NOT NULL,
    fulfilled_by_PO TEXT DEFAULT 'initiation/addition' NOT NULL,
    fulfilled_quantity INTEGER NOT NULL,
    cost NUMERIC(15, 2) NOT NULL,
    unit_cost NUMERIC(15, 2) GENERATED ALWAYS AS (cost / NULLIF(fulfilled_quantity,0)) STORED,
    manufacture_completion_date DATE NOT NULL,
    status TEXT DEFAULT 'COMPLETED' NOT NULL,
    quantity_left INTEGER DEFAULT 0 NOT NULL
);

-- Trigger function: enforce uppercase for relevant columns
CREATE OR REPLACE FUNCTION enforce_uppercase_stock_initiation_addition()
RETURNS TRIGGER AS $$
BEGIN
    NEW.SKU := UPPER(NEW.SKU);
    NEW.product := UPPER(NEW.product);
    NEW.fulfilled_by_PO := UPPER(NEW.fulfilled_by_PO);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_stock_initiation_addition_before_insert
BEFORE INSERT ON StockInitiationAddition
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_stock_initiation_addition();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_stock_initiation_addition_before_update
BEFORE UPDATE ON StockInitiationAddition
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_stock_initiation_addition();
