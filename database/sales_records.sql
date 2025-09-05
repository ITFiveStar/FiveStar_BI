
-- Table: Sales Records
CREATE TABLE SalesRecords (
    sales_record_id TEXT NOT NULL,
    sales_date DATE NOT NULL,
    SKU TEXT NOT NULL,
    quantity_sold INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    PRIMARY KEY (sales_record_id, SKU), -- Composite primary key
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
);

-- Trigger function: enforce uppercase
CREATE OR REPLACE FUNCTION enforce_uppercase_sales_records()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sales_record_id := UPPER(NEW.sales_record_id);
    NEW.SKU := UPPER(NEW.SKU);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_sales_records_before_insert
BEFORE INSERT ON SalesRecords
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_sales_records();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_sales_records_before_update
BEFORE UPDATE ON SalesRecords
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_sales_records();
