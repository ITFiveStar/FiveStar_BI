
-- Table: Customers
CREATE TABLE Customers (
    customer_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE UNIQUE INDEX customers_name_unique_idx ON Customers (LOWER(name));
