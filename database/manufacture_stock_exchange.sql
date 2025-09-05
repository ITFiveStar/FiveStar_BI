
-- Table: StockExchange
CREATE TABLE StockExchange (
    id SERIAL PRIMARY KEY,
    SKU_original TEXT NOT NULL,
    SKU_new TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    exchange_date DATE NOT NULL,
    UNIQUE (SKU_original, SKU_new, exchange_date)
);

-- Trigger function: enforce uppercase for SKUs
CREATE OR REPLACE FUNCTION enforce_uppercase_stock_exchange()
RETURNS TRIGGER AS $$
BEGIN
    NEW.SKU_original := UPPER(NEW.SKU_original);
    NEW.SKU_new := UPPER(NEW.SKU_new);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Before insert
CREATE TRIGGER enforce_uppercase_stock_exchange_before_insert
BEFORE INSERT ON StockExchange
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_stock_exchange();

-- Trigger: Before update
CREATE TRIGGER enforce_uppercase_stock_exchange_before_update
BEFORE UPDATE ON StockExchange
FOR EACH ROW
EXECUTE FUNCTION enforce_uppercase_stock_exchange();
