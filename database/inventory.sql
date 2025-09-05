
-- Table: Inventory
CREATE TABLE Inventory (
    SKU TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    manufactured_total_quantity INTEGER NOT NULL,
    in_stock_quantity INTEGER NOT NULL CHECK (in_stock_quantity >= 0), -- Prevent negative stock
    inventory_value NUMERIC(15, 2) NOT NULL,
    PRIMARY KEY (SKU, as_of_date) -- Composite primary key
);

-- Trigger function: enforce uppercase SKU
CREATE OR REPLACE FUNCTION enforce_uppercase_inventory()
RETURNS TRIGGER AS $$
BEGIN
    NEW.SKU := UPPER(NEW.SKU);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_inventory_before_insert
BEFORE INSERT ON Inventory
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_inventory();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_inventory_before_update
BEFORE UPDATE ON Inventory
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_inventory();
