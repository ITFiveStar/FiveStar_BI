
-- Table: Purchase Orders
CREATE TABLE PurchaseOrders (
    purchase_order_id TEXT NOT NULL, -- Part of the composite primary key
    supplier_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    product TEXT NOT NULL, -- Part of the composite primary key
    purchase_quantity INTEGER NOT NULL,
    purchase_unit_price DECIMAL(15, 4) NOT NULL,
    total_cost DECIMAL(15, 4) GENERATED ALWAYS AS (purchase_quantity * purchase_unit_price * fx_rate) STORED,
    purchase_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    fx_rate DECIMAL(10, 4) NOT NULL,
    quantity_left INTEGER DEFAULT 0 NOT NULL,
    PRIMARY KEY (purchase_order_id, product), -- Composite primary key
    FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id)
);

DROP TRIGGER IF EXISTS enforce_uppercase_purchase_orders_after_insert ON purchaseorders;
DROP TRIGGER IF EXISTS enforce_uppercase_purchase_orders_after_update ON purchaseorders;
DROP TRIGGER IF EXISTS enforce_uppercase_purchase_orders ON purchaseorders;
DROP FUNCTION IF EXISTS uppercase_purchase_orders();

CREATE OR REPLACE FUNCTION uppercase_purchase_orders()
RETURNS trigger AS $$
BEGIN
  NEW.purchase_order_id := UPPER(NEW.purchase_order_id);
  NEW.product           := UPPER(NEW.product);
  NEW.purchase_currency := UPPER(NEW.purchase_currency);
  NEW.target_currency   := UPPER(NEW.target_currency);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_uppercase_purchase_orders ON purchaseorders;

CREATE TRIGGER enforce_uppercase_purchase_orders
BEFORE INSERT OR UPDATE ON purchaseorders
FOR EACH ROW
EXECUTE FUNCTION uppercase_purchase_orders();