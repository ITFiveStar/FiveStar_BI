
-- Table: Manufacture Orders
CREATE TABLE ManufactureOrders (
    id SERIAL PRIMARY KEY, -- Simple primary key
    manufacture_order_id INTEGER NOT NULL, -- Reset externally by manufactor_orders_re_ranking.py
    SKU TEXT NOT NULL,
    product TEXT NOT NULL,
    manufacture_quantity INTEGER NOT NULL,
    manufacture_date DATE NOT NULL,
    UNIQUE (SKU, manufacture_date, product) -- Enforces uniqueness
);

-- Trigger function: enforce uppercase on SKU and product
CREATE OR REPLACE FUNCTION enforce_uppercase_manufacture_orders()
RETURNS TRIGGER AS $$
BEGIN
    NEW.SKU := UPPER(NEW.SKU);
    NEW.product := UPPER(NEW.product);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_manufacture_orders_before_insert
BEFORE INSERT ON ManufactureOrders
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_manufacture_orders();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_manufacture_orders_before_update
BEFORE UPDATE ON ManufactureOrders
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_manufacture_orders();
