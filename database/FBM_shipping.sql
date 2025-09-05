
-- Table: FBMShippingCost
CREATE TABLE FBMShippingCost (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL,
    shipping_id TEXT NOT NULL,
    shipping_cost NUMERIC(10, 2) NOT NULL,
    warehouse_cost NUMERIC(10, 2) NOT NULL,
    source TEXT NOT NULL,
    payment_date TIMESTAMP
);


