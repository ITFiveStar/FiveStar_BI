
-- Table: Returns
CREATE TABLE Returns (
    return_order_id TEXT NOT NULL,
    SKU TEXT NOT NULL,
    return_date DATE NOT NULL,
    return_quantity INTEGER NOT NULL,
    return_unit_price NUMERIC(15, 2) NOT NULL,
    supplier_id INTEGER NOT NULL,
    total_cost NUMERIC(15, 2) GENERATED ALWAYS AS (return_quantity * return_unit_price * fx_rate) STORED,
    return_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    fx_rate NUMERIC(10, 4) NOT NULL,
    quantity_left INTEGER DEFAULT 0 NOT NULL,
    PRIMARY KEY (return_order_id, SKU, return_date), -- Composite PK
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id),
    FOREIGN KEY (return_order_id, SKU) REFERENCES SalesRecords(sales_record_id, SKU)
);

-- Trigger function: enforce uppercase on relevant columns
CREATE OR REPLACE FUNCTION enforce_uppercase_returns()
RETURNS TRIGGER AS $$
BEGIN
    NEW.return_order_id := UPPER(NEW.return_order_id);
    NEW.SKU := UPPER(NEW.SKU);
    NEW.return_currency := UPPER(NEW.return_currency);
    NEW.target_currency := UPPER(NEW.target_currency);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_returns_before_insert
BEFORE INSERT ON Returns
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_returns();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_returns_before_update
BEFORE UPDATE ON Returns
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_returns();
