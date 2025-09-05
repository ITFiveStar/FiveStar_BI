
-- Table: InventoryRawMaterial
CREATE TABLE InventoryRawMaterial (
    Product TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    purchased_total_quantity INTEGER NOT NULL,
    in_stock_quantity INTEGER NOT NULL CHECK (in_stock_quantity >= 0), -- Prevent negative stock
    inventory_value NUMERIC(15, 2) NOT NULL,
    PRIMARY KEY (Product, as_of_date) -- Composite primary key
);

-- Trigger function: enforce uppercase for Product
CREATE OR REPLACE FUNCTION enforce_uppercase_inventory_raw_material()
RETURNS TRIGGER AS $$
BEGIN
    NEW.Product := UPPER(NEW.Product);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_inventory_raw_material_before_insert
BEFORE INSERT ON InventoryRawMaterial
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_inventory_raw_material();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_inventory_raw_material_before_update
BEFORE UPDATE ON InventoryRawMaterial
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_inventory_raw_material();
