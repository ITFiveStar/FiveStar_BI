
-- Table: AdsCreditCardPayment
CREATE TABLE AdsCreditCardPayment (
    id SERIAL PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    issued_on DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount_billed NUMERIC(10, 2) NOT NULL
);
