
-- Table: AmazonAllOrders
CREATE TABLE AmazonAllOrders (
    id SERIAL PRIMARY KEY,
    amazon_order_id TEXT NOT NULL,
    purchase_date_utc TIMESTAMP NOT NULL,
    purchase_date_pst_pdt TIMESTAMP NOT NULL,
    order_status TEXT NOT NULL,
    fulfillment_channel TEXT NOT NULL,
    sales_channel TEXT NOT NULL,
    sku TEXT NOT NULL,
    item_status TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    currency TEXT,
    item_price NUMERIC(10, 2),
    item_tax NUMERIC(10, 2),
    shipping_price NUMERIC(10, 2),
    shipping_tax NUMERIC(10, 2),
    gift_wrap_price NUMERIC(10, 2),
    gift_wrap_tax NUMERIC(10, 2),
    item_promotion_discount NUMERIC(10, 2),
    ship_promotion_discount NUMERIC(10, 2)
);
