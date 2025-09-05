
-- Table: Suppliers
CREATE TABLE Suppliers (
    supplier_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE UNIQUE INDEX suppliers_name_unique_idx ON Suppliers (LOWER(name));
