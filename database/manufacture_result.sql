
-- Table: ManufactureResult
CREATE TABLE ManufactureResult (
    result_id SERIAL PRIMARY KEY,
    manufacture_order_id INTEGER NOT NULL,
    manufacture_batch INTEGER NOT NULL,
    SKU TEXT NOT NULL,
    product TEXT NOT NULL,
    fulfilled_by_PO TEXT NOT NULL,
    fulfilled_quantity INTEGER NOT NULL,
    cost NUMERIC(15, 4) NOT NULL,
    unit_cost NUMERIC(15, 4),
    manufacture_completion_date DATE NOT NULL,
    status TEXT CHECK (status IN ('COMPLETED', 'FAILED')),
    quantity_left INTEGER NOT NULL,
    FOREIGN KEY (fulfilled_by_PO, product) REFERENCES PurchaseOrders(purchase_order_id, product), -- Composite foreign key
    UNIQUE (manufacture_order_id, manufacture_batch, fulfilled_by_PO, product)
);

-- Trigger function: enforce uppercase for relevant columns
CREATE OR REPLACE FUNCTION enforce_uppercase_manufacture_result()
RETURNS TRIGGER AS $$
BEGIN
    NEW.SKU := UPPER(NEW.SKU);
    NEW.product := UPPER(NEW.product);
    NEW.fulfilled_by_PO := UPPER(NEW.fulfilled_by_PO);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_manufacture_result_before_insert
BEFORE INSERT ON ManufactureResult
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_manufacture_result();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_manufacture_result_before_update
BEFORE UPDATE ON ManufactureResult
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_manufacture_result();
