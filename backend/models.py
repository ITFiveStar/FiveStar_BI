from backend import db
from sqlalchemy import Computed

class Customer(db.Model):
    __tablename__ = 'customers'

    customer_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False, unique=True)  

    def to_dict(self):
        return {
            'customer_id': self.customer_id,
            'name': self.name
        }

class Supplier(db.Model):
    __tablename__ = 'suppliers'

    supplier_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False, unique=True)  

    def to_dict(self):
        return {
            'supplier_id': self.supplier_id,
            'name': self.name
        }

class PurchaseOrder(db.Model):
    __tablename__ = 'purchaseorders'

    purchase_order_id = db.Column(db.String, nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.supplier_id'), nullable=False)
    order_date = db.Column(db.Date, nullable=False)
    product = db.Column(db.String, nullable=False)
    purchase_quantity = db.Column(db.Integer, nullable=False)
    purchase_unit_price = db.Column(db.Numeric(15, 4), nullable=False)
    total_cost = db.Column(db.Numeric(15, 4), Computed('purchase_quantity * purchase_unit_price * fx_rate'))  # Handled by the database trigger
    purchase_currency = db.Column(db.String, nullable=False)
    target_currency = db.Column(db.String, nullable=False)
    fx_rate = db.Column(db.Numeric(10, 4), nullable=False)
    quantity_left = db.Column(db.Integer, default=0, nullable=False)

    # Define relationship with Supplier
    supplier = db.relationship(
        'Supplier',
        backref='purchase_orders',
        foreign_keys=[supplier_id],  # Specify which column is the foreign key
        lazy='joined'  # This will ensure the supplier is always loaded with the purchase order
    )

    __table_args__ = (
        db.PrimaryKeyConstraint('purchase_order_id', 'product'),
    )

    def to_dict(self):
        return {
            'purchase_order_id': self.purchase_order_id,
            'supplier_name': self.supplier.name if self.supplier else None,  # Add null check
            'order_date': self.order_date.isoformat(),
            'product': self.product,
            'purchase_quantity': self.purchase_quantity,
            'purchase_unit_price': str(self.purchase_unit_price),
            'total_cost': str(self.total_cost),
            'purchase_currency': self.purchase_currency,
            'target_currency': self.target_currency,
            'fx_rate': str(self.fx_rate),
            'quantity_left': self.quantity_left
        }

class ManufactureOrder(db.Model):
    __tablename__ = 'manufactureorders'

    id = db.Column(db.Integer, primary_key=True)
    manufacture_order_id = db.Column(db.Integer, nullable=False, default=0)
    sku = db.Column(db.String, nullable=False)
    product = db.Column(db.String, nullable=False)
    manufacture_quantity = db.Column(db.Integer, nullable=False)
    manufacture_date = db.Column(db.Date, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('sku', 'manufacture_date', 'product', name='uq_sku_date_product'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'manufacture_order_id': self.manufacture_order_id,
            'sku': self.sku,
            'product': self.product,
            'manufacture_quantity': self.manufacture_quantity,
            'manufacture_date': self.manufacture_date.isoformat()
        }

class SalesRecord(db.Model):
    __tablename__ = 'salesrecords'

    sales_record_id = db.Column(db.String, nullable=False)
    sales_date = db.Column(db.Date, nullable=False)
    sku = db.Column(db.String, nullable=False)
    quantity_sold = db.Column(db.Integer, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.customer_id'), nullable=False)

    # Define relationship with Customer
    customer = db.relationship(
        'Customer',
        backref='sales_records',
        foreign_keys=[customer_id],
        lazy='joined'
    )

    __table_args__ = (
        db.PrimaryKeyConstraint('sales_record_id', 'sku'),
    )

    def to_dict(self):
        return {
            'sales_record_id': self.sales_record_id,
            'sales_date': self.sales_date.isoformat(),
            'sku': self.sku,
            'quantity_sold': self.quantity_sold,
            'customer_name': self.customer.name if self.customer else None
        }

class Return(db.Model):
    __tablename__ = 'returns'

    return_order_id = db.Column(db.String, nullable=False)
    sku = db.Column(db.String, nullable=False)
    return_date = db.Column(db.Date, nullable=False)
    return_quantity = db.Column(db.Integer, nullable=False)
    return_unit_price = db.Column(db.Numeric(15, 2), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.supplier_id'), nullable=False)
    total_cost = db.Column(db.Numeric(15, 2), Computed('return_quantity * return_unit_price * fx_rate'))  # Handled by the database trigger
    return_currency = db.Column(db.String, nullable=False)
    target_currency = db.Column(db.String, nullable=False)
    fx_rate = db.Column(db.Numeric(10, 4), nullable=False)
    quantity_left = db.Column(db.Integer, default=0, nullable=False)

    # Define relationship with Supplier
    supplier = db.relationship(
        'Supplier',
        backref='returns',
        foreign_keys=[supplier_id],
        lazy='joined'
    )

    __table_args__ = (
        db.PrimaryKeyConstraint('return_order_id', 'sku', 'return_date'),
        db.ForeignKeyConstraint(
            ['return_order_id', 'sku'],
            ['salesrecords.sales_record_id', 'salesrecords.sku'],
            name='fk_return_sales_record'
        ),
    )

    def to_dict(self):
        return {
            'return_order_id': self.return_order_id,
            'sku': self.sku,
            'return_date': self.return_date.isoformat(),
            'return_quantity': self.return_quantity,
            'return_unit_price': str(self.return_unit_price),
            'supplier_name': self.supplier.name if self.supplier else None,
            'total_cost': str(self.total_cost),
            'return_currency': self.return_currency,
            'target_currency': self.target_currency,
            'fx_rate': str(self.fx_rate),
            'quantity_left': self.quantity_left
        }
    
class ManufactureStockInitiationAddition(db.Model):
    __tablename__ = 'stockinitiationaddition'

    result_id = db.Column(db.Integer, primary_key=True)
    manufacture_order_id = db.Column(db.Integer, default=-1, nullable=False)
    manufacture_batch = db.Column(db.Integer, default=-1, nullable=False)
    sku = db.Column(db.String, nullable=False)
    product = db.Column(db.String, default='initiation/addition', nullable=False)
    fulfilled_by_po = db.Column(db.String, default='initiation/addition', nullable=False)
    fulfilled_quantity = db.Column(db.Integer, nullable=False)
    cost = db.Column(db.Numeric(15, 2), nullable=False)
    unit_cost = db.Column(db.Numeric(15, 2), Computed('cost / fulfilled_quantity'))  # Handled by the database trigger
    manufacture_completion_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String, default='COMPLETED', nullable=False)
    quantity_left = db.Column(db.Integer, default=0, nullable=False)

    def to_dict(self):
        return {
            'result_id': self.result_id,
            'manufacture_order_id': self.manufacture_order_id,
            'manufacture_batch': self.manufacture_batch,
            'SKU': self.SKU,
            'product': self.product,
            'fulfilled_by_po': self.fulfilled_by_po,
            'fulfilled_quantity': self.fulfilled_quantity,
            'cost': str(self.cost),
            'unit_cost': str(self.unit_cost),
            'manufacture_completion_date': self.manufacture_completion_date.isoformat(),
            'status': self.status,
            'quantity_left': self.quantity_left
        }

class StockExchange(db.Model):
    __tablename__ = 'stockexchange'

    id = db.Column(db.Integer, primary_key=True)
    sku_original = db.Column(db.String, nullable=False)
    sku_new = db.Column(db.String, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    exchange_date = db.Column(db.Date, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('sku_original', 'sku_new', 'exchange_date', name='uq_sku_exchange'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'sku_original': self.sku_original,
            'sku_new': self.sku_new,
            'quantity': self.quantity,
            'exchange_date': self.exchange_date.isoformat()
        }
    
class FailedStockExchange(db.Model):
    __tablename__ = 'failedstockexchange'

    id = db.Column(db.Integer, primary_key=True)
    sku_original = db.Column(db.String, nullable=False)
    sku_new = db.Column(db.String, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    exchange_date = db.Column(db.Date, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('sku_original', 'sku_new', 'exchange_date', name='uq_failed_sku_exchange'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'sku_original': self.sku_original,
            'sku_new': self.sku_new,
            'quantity': self.quantity,
            'exchange_date': self.exchange_date.isoformat()
        }

class ManufactureResult(db.Model):
    __tablename__ = 'manufactureresult'

    result_id = db.Column(db.Integer, primary_key=True)
    manufacture_order_id = db.Column(db.Integer, nullable=False)
    manufacture_batch = db.Column(db.Integer, nullable=False)
    sku = db.Column(db.String, nullable=False)
    product = db.Column(db.String, nullable=False)
    fulfilled_by_po = db.Column(db.String, nullable=False)
    fulfilled_quantity = db.Column(db.Integer, nullable=False)
    cost = db.Column(db.Numeric(15, 4), nullable=False)
    unit_cost = db.Column(db.Numeric(15, 4))  
    manufacture_completion_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String, nullable=False)
    quantity_left = db.Column(db.Integer, nullable=False)

    __table_args__ = (
        db.ForeignKeyConstraint(
            ['fulfilled_by_po', 'product'], ['purchaseorders.purchase_order_id', 'purchaseorders.product']
        ),
        db.UniqueConstraint('manufacture_order_id', 'manufacture_batch', 'fulfilled_by_po', 'product', 
                           name='uq_manufacture_result'),
    )

    def to_dict(self):
        return {
            'result_id': self.result_id,
            'manufacture_order_id': self.manufacture_order_id,
            'manufacture_batch': self.manufacture_batch,
            'sku': self.sku,
            'product': self.product,
            'fulfilled_by_po': self.fulfilled_by_po,
            'fulfilled_quantity': self.fulfilled_quantity,
            'cost': str(self.cost),
            'unit_cost': str(self.unit_cost),
            'manufacture_completion_date': self.manufacture_completion_date.isoformat(),
            'status': self.status,
            'quantity_left': self.quantity_left
        }
    
class FailedManufactureResult(db.Model):
    __tablename__ = 'failedmanufactureresult'

    id = db.Column(db.Integer, primary_key=True)
    manufacture_order_id = db.Column(db.Integer, nullable=False)
    sku = db.Column(db.String, nullable=False)
    product = db.Column(db.String, nullable=False)
    manufacture_date = db.Column(db.Date, nullable=False)
    failure_reason = db.Column(db.String, nullable=False)

    __table_args__ = (
        db.ForeignKeyConstraint(
            ['sku', 'product', 'manufacture_date'], ['manufactureorders.sku', 'manufactureorders.product', 'manufactureorders.manufacture_date']
        ),
        db.UniqueConstraint('sku', 'product', 'manufacture_date', name='uq_failed_manufacture_result'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'manufacture_order_id': self.manufacture_order_id,
            'sku': self.sku,
            'product': self.product,
            'manufacture_date': self.manufacture_date.isoformat(),
            'failure_reason': self.failure_reason,
        }

class Inventory(db.Model):
    __tablename__ = 'inventory'

    sku = db.Column(db.String, nullable=False)
    as_of_date = db.Column(db.Date, nullable=False)
    manufactured_total_quantity = db.Column(db.Integer, nullable=False)
    in_stock_quantity = db.Column(db.Integer, nullable=False)
    inventory_value = db.Column(db.Numeric(15, 2), nullable=False)

    __table_args__ = (
        db.PrimaryKeyConstraint('sku', 'as_of_date'),
    )

    def to_dict(self):
        return {
            'sku': self.sku,
            'as_of_date': self.as_of_date.isoformat(),
            'manufactured_total_quantity': self.manufactured_total_quantity,
            'in_stock_quantity': self.in_stock_quantity,
            'inventory_value': str(self.inventory_value)
        }

class InventoryRawMaterial(db.Model):
    __tablename__ = 'inventoryrawmaterial'

    product = db.Column(db.String, nullable=False)
    as_of_date = db.Column(db.Date, nullable=False)
    purchased_total_quantity = db.Column(db.Integer, nullable=False)
    in_stock_quantity = db.Column(db.Integer, nullable=False)
    inventory_value = db.Column(db.Numeric(15, 2), nullable=False)
    __table_args__ = (
        db.PrimaryKeyConstraint('product', 'as_of_date'),
    )

    def to_dict(self):
        return {
            'product': self.product,
            'as_of_date': self.as_of_date.isoformat(),
            'purchased_total_quantity': self.purchased_total_quantity,
            'in_stock_quantity': self.in_stock_quantity,
            'inventory_value': str(self.inventory_value)
        }

class COGS(db.Model):
    __tablename__ = 'cogs'

    id = db.Column(db.Integer, primary_key=True)
    sales_record_id = db.Column(db.String, nullable=False)
    sales_date = db.Column(db.Date, nullable=False)
    sku = db.Column(db.String, nullable=False)
    quantity_sold = db.Column(db.Integer, nullable=False)
    result_id = db.Column(db.Integer, nullable=False)
    manufacture_batch = db.Column(db.Integer, nullable=False)
    product = db.Column(db.String, nullable=False)
    fulfilled_by_po = db.Column(db.String, nullable=False)
    cogs = db.Column(db.Numeric(15, 2), nullable=False)

    __table_args__ = (
        # db.ForeignKeyConstraint(
        #     ['result_id', 'manufacture_batch', 'fulfilled_by_po', 'product'],
        #     ['ManufactureResult.manufacture_order_id', 'ManufactureResult.manufacture_batch', 'ManufactureResult.fulfilled_by_po', 'ManufactureResult.product'],
        #     name='fk_result_po_product'
        # ),
        db.ForeignKeyConstraint(
            ['sales_record_id', 'sku'],
            ['salesrecords.sales_record_id', 'salesrecords.sku'],
            name='fk_sales_record_sku'
        ),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'sales_record_id': self.sales_record_id,
            'sales_date': self.sales_date.isoformat(),
            'sku': self.sku,
            'quantity_sold': self.quantity_sold,
            'result_id': self.result_id,
            'manufacture_batch': self.manufacture_batch,
            'product': self.product,
            'fulfilled_by_po': self.fulfilled_by_po,
            'cogs': str(self.cogs)
        }

class FailedCOGS(db.Model):
    __tablename__ = 'failedcogs'    

    id = db.Column(db.Integer, primary_key=True)
    sales_record_id = db.Column(db.String, nullable=False)
    sales_date = db.Column(db.Date, nullable=False)
    sku = db.Column(db.String, nullable=False)
    quantity_sold = db.Column(db.Integer, nullable=False)
    failed_quantity = db.Column(db.Integer, nullable=False)
    failure_reason = db.Column(db.String, nullable=False)           

    __table_args__ = (
        db.ForeignKeyConstraint(
            ['sales_record_id', 'sku'],
            ['salesrecords.sales_record_id', 'salesrecords.sku'],
            name='fk_sales_record_sku'
        ),          
    )

    def to_dict(self):
        return {
            'id': self.id,
            'sales_record_id': self.sales_record_id,
            'sales_date': self.sales_date.isoformat(),
            'sku': self.sku,
            'quantity_sold': self.quantity_sold,
            'failed_quantity': self.failed_quantity,
            'failure_reason': self.failure_reason
        }

# Amazon BI Tables
class AmazonAllOrders(db.Model):
    __tablename__ = 'amazonallorders'

    id = db.Column(db.Integer, primary_key=True)
    amazon_order_id = db.Column(db.String, nullable=False)
    purchase_date_utc = db.Column(db.DateTime, nullable=False)
    purchase_date_pst_pdt = db.Column(db.DateTime, nullable=False)
    order_status = db.Column(db.String, nullable=False)
    fulfillment_channel = db.Column(db.String, nullable=False)
    sales_channel = db.Column(db.String, nullable=False)
    sku = db.Column(db.String, nullable=False)
    item_status = db.Column(db.String, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String)
    item_price = db.Column(db.Numeric(10, 2))
    item_tax = db.Column(db.Numeric(10, 2))
    shipping_price = db.Column(db.Numeric(10, 2))
    shipping_tax = db.Column(db.Numeric(10, 2))
    gift_wrap_price = db.Column(db.Numeric(10, 2))
    gift_wrap_tax = db.Column(db.Numeric(10, 2))
    item_promotion_discount = db.Column(db.Numeric(10, 2))
    ship_promotion_discount = db.Column(db.Numeric(10, 2))

    def to_dict(self):
        return {
            'id': self.id,
            'amazon_order_id': self.amazon_order_id,
            'purchase_date_utc': self.purchase_date_utc.isoformat() if self.purchase_date_utc else None,
            'purchase_date_pst_pdt': self.purchase_date_pst_pdt.isoformat() if self.purchase_date_pst_pdt else None,
            'order_status': self.order_status,
            'fulfillment_channel': self.fulfillment_channel,
            'sales_channel': self.sales_channel,
            'sku': self.sku,
            'item_status': self.item_status,
            'quantity': self.quantity,
            'currency': self.currency,
            'item_price': str(self.item_price) if self.item_price is not None else None,
            'item_tax': str(self.item_tax) if self.item_tax is not None else None,
            'shipping_price': str(self.shipping_price) if self.shipping_price is not None else None,
            'shipping_tax': str(self.shipping_tax) if self.shipping_tax is not None else None,
            'gift_wrap_price': str(self.gift_wrap_price) if self.gift_wrap_price is not None else None,
            'gift_wrap_tax': str(self.gift_wrap_tax) if self.gift_wrap_tax is not None else None,
            'item_promotion_discount': str(self.item_promotion_discount) if self.item_promotion_discount is not None else None,
            'ship_promotion_discount': str(self.ship_promotion_discount) if self.ship_promotion_discount is not None else None
        }


class SKUEconomics(db.Model):
    __tablename__ = 'skueconomics'

    id = db.Column(db.Integer, primary_key=True)
    amazon_store = db.Column(db.String, nullable=False)
    start_date_pst_pdt = db.Column(db.Date, nullable=False)
    end_date_pst_pdt = db.Column(db.Date, nullable=False)
    msku = db.Column(db.String, nullable=False)
    currency_code = db.Column(db.String, nullable=False)
    fba_fulfillment_fees_total = db.Column(db.Numeric(10, 2))
    sponsored_products_charge_total = db.Column(db.Numeric(10, 2))
    monthly_inventory_storage_fee_total = db.Column(db.Numeric(10, 2))
    inbound_transportation_charge_total = db.Column(db.Numeric(10, 2))

    def to_dict(self):
        return {
            'id': self.id,
            'amazon_store': self.amazon_store,
            'start_date_pst_pdt': self.start_date_pst_pdt.isoformat() if self.start_date_pst_pdt else None,
            'end_date_pst_pdt': self.end_date_pst_pdt.isoformat() if self.end_date_pst_pdt else None,
            'msku': self.msku,
            'currency_code': self.currency_code,
            'fba_fulfillment_fees_total': str(self.fba_fulfillment_fees_total) if self.fba_fulfillment_fees_total is not None else None,
            'sponsored_products_charge_total': str(self.sponsored_products_charge_total) if self.sponsored_products_charge_total is not None else None,
            'monthly_inventory_storage_fee_total': str(self.monthly_inventory_storage_fee_total) if self.monthly_inventory_storage_fee_total is not None else None,
            'inbound_transportation_charge_total': str(self.inbound_transportation_charge_total) if self.inbound_transportation_charge_total is not None else None
        }
    
class AdsSpendByDay(db.Model):
    __tablename__ = 'adsspendbyday'
    
    id = db.Column(db.Integer, primary_key=True)
    date_by_day = db.Column(db.Date, nullable=False)
    sku = db.Column(db.String, nullable=False)
    spend = db.Column(db.Numeric(10, 2))
    
    def to_dict(self):
        return {
            'id': self.id,
            'date_by_day': self.date_by_day.isoformat() if self.date_by_day else None,
            'sku': self.sku,
            'spend': str(self.spend) if self.spend is not None else None
        }

class AmazonStatements(db.Model):
    __tablename__ = 'amazonstatements'

    id = db.Column(db.Integer, primary_key=True)
    settlement_id = db.Column(db.String, nullable=False)
    settlement_start_date_utc = db.Column(db.DateTime)
    settlement_start_date_pst_pdt = db.Column(db.DateTime)
    settlement_end_date_utc = db.Column(db.DateTime)
    settlement_end_date_pst_pdt = db.Column(db.DateTime)
    deposit_date_utc = db.Column(db.DateTime)
    deposit_date_pst_pdt = db.Column(db.DateTime)
    total_amount = db.Column(db.Numeric(10, 2))
    currency = db.Column(db.String)
    transaction_type = db.Column(db.String)
    order_id = db.Column(db.String)
    marketplace_name = db.Column(db.String)
    amount_type = db.Column(db.String)
    amount_description = db.Column(db.String)
    amount = db.Column(db.Numeric(10, 2))
    posted_date_time_utc = db.Column(db.DateTime)
    posted_date_time_pst_pdt = db.Column(db.DateTime)
    sku = db.Column(db.String)
    quantity_purchased = db.Column(db.Integer)

    def to_dict(self):
        return {
            'id': self.id,
            'settlement_id': self.settlement_id,
            'settlement_start_date_utc': self.settlement_start_date_utc.isoformat() if self.settlement_start_date_utc else None,
            'settlement_start_date_pst_pdt': self.settlement_start_date_pst_pdt.isoformat() if self.settlement_start_date_pst_pdt else None,
            'settlement_end_date_utc': self.settlement_end_date_utc.isoformat() if self.settlement_end_date_utc else None,
            'settlement_end_date_pst_pdt': self.settlement_end_date_pst_pdt.isoformat() if self.settlement_end_date_pst_pdt else None,
            'deposit_date_utc': self.deposit_date_utc.isoformat() if self.deposit_date_utc else None,
            'deposit_date_pst_pdt': self.deposit_date_pst_pdt.isoformat() if self.deposit_date_pst_pdt else None,
            'total_amount': str(self.total_amount) if self.total_amount is not None else None,
            'currency': self.currency,
            'transaction_type': self.transaction_type,
            'order_id': self.order_id,
            'marketplace_name': self.marketplace_name,
            'amount_type': self.amount_type,
            'amount_description': self.amount_description,
            'amount': str(self.amount) if self.amount is not None else None,
            'posted_date_time_utc': self.posted_date_time_utc.isoformat() if self.posted_date_time_utc else None,
            'posted_date_time_pst_pdt': self.posted_date_time_pst_pdt.isoformat() if self.posted_date_time_pst_pdt else None,
            'sku': self.sku,
            'quantity_purchased': self.quantity_purchased
        }

class AdsCreditCardPayment(db.Model):
    __tablename__ = 'adscreditcardpayment'

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.String, nullable=False)
    issued_on = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    total_amount_billed = db.Column(db.Numeric(10, 2), nullable=False)

    def to_dict(self): 
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'issued_on': self.issued_on.isoformat() if self.issued_on else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'total_amount_billed': str(self.total_amount_billed) if self.total_amount_billed is not None else None
        }

class AmazonInboundShipping(db.Model):
    __tablename__ = 'amazoninboundshipping'

    id = db.Column(db.Integer, primary_key=True)
    shipment_name = db.Column(db.String, nullable=False)
    shipment_id = db.Column(db.String, nullable=False)
    created_pst_pdt = db.Column(db.DateTime)
    last_updated_pst_pdt = db.Column(db.DateTime)
    ship_to = db.Column(db.String)
    units_expected = db.Column(db.Integer)
    units_located = db.Column(db.Integer)
    status = db.Column(db.String)
    amazon_partnered_carrier_cost = db.Column(db.Numeric(10, 2))
    currency = db.Column(db.String)
    msku = db.Column(db.String)

    def to_dict(self):
        return {
            'id': self.id,
            'shipment_name': self.shipment_name,
            'shipment_id': self.shipment_id,
            'created_pst_pdt': self.created_pst_pdt.isoformat() if self.created_pst_pdt else None,
            'last_updated_pst_pdt': self.last_updated_pst_pdt.isoformat() if self.last_updated_pst_pdt else None,
            'ship_to': self.ship_to,
            'units_expected': self.units_expected,
            'units_located': self.units_located,
            'status': self.status,
            'amazon_partnered_carrier_cost': str(self.amazon_partnered_carrier_cost) if self.amazon_partnered_carrier_cost is not None else None,
            'currency': self.currency,
            'msku': self.msku
        }
    
class FBMShippingCost(db.Model):
    __tablename__ = 'fbmshippingcost'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String, nullable=False)
    shipping_id = db.Column(db.String, nullable=False)
    shipping_cost = db.Column(db.Numeric(10, 2))
    warehouse_cost = db.Column(db.Numeric(10, 2))
    source = db.Column(db.String)
    payment_date = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'shipping_id': self.shipping_id,
            'shipping_cost': str(self.shipping_cost) if self.shipping_cost is not None else None,
            'warehouse_cost': str(self.warehouse_cost) if self.warehouse_cost is not None else None,
            'source': self.source,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None
        }
    

class AllOrdersPnL(db.Model):
    __tablename__ = 'allorderspnl'
    
    id = db.Column(db.Integer, primary_key=True)
    sales_status = db.Column(db.String, nullable=False)
    sales_channel = db.Column(db.String)
    fulfillment_channel = db.Column(db.String)
    product_type = db.Column(db.String)
    payment_status = db.Column(db.String, nullable=False)
    return_status = db.Column(db.String)
    amazon_order_id = db.Column(db.String)
    sku = db.Column(db.String)
    quantity = db.Column(db.Integer)
    purchase_date_pst_pdt = db.Column(db.DateTime)
    data_month_last_day = db.Column(db.Date, nullable=False)
    currency = db.Column(db.String)
    item_price = db.Column(db.Numeric(10, 2))
    shipping_price = db.Column(db.Numeric(10, 2))
    gift_wrap_price = db.Column(db.Numeric(10, 2))
    item_tax = db.Column(db.Numeric(10, 2))
    shipping_tax = db.Column(db.Numeric(10, 2))
    gift_wrap_tax = db.Column(db.Numeric(10, 2))
    item_promotion_discount = db.Column(db.Numeric(10, 2))
    ship_promotion_discount = db.Column(db.Numeric(10, 2))
    commission = db.Column(db.Numeric(10, 2))
    sponsored_products_charge = db.Column(db.Numeric(10, 2))
    sales_tax_service_fee = db.Column(db.Numeric(10, 2))
    marketplace_facilitator_tax_principal = db.Column(db.Numeric(10, 2))
    marketplace_facilitator_tax_shipping = db.Column(db.Numeric(10, 2))
    digital_services_fee = db.Column(db.Numeric(10, 2))
    fba_fulfillment_fee = db.Column(db.Numeric(10, 2))
    fba_inbound_transportation_fee = db.Column(db.Numeric(10, 2))
    fba_storage_fee = db.Column(db.Numeric(10, 2))
    fbm_shipping_commission = db.Column(db.Numeric(10, 2))
    subscription_fee = db.Column(db.Numeric(10, 2))
    order_settlement_id = db.Column(db.String)
    order_deposit_date_pst_pdt = db.Column(db.DateTime)
    order_posted_date_pst_pdt = db.Column(db.DateTime)
    non_order_settlement_id = db.Column(db.String)
    non_order_deposit_date_pst_pdt = db.Column(db.DateTime)
    non_order_posted_date_pst_pdt = db.Column(db.DateTime)
    statements_item_price = db.Column(db.Numeric(10, 2))
    statements_shipping_price = db.Column(db.Numeric(10, 2))
    statements_shipping_chargeback = db.Column(db.Numeric(10, 2))
    statements_gift_wrap_price = db.Column(db.Numeric(10, 2))
    statements_gift_wrap_chargeback = db.Column(db.Numeric(10, 2))
    statements_item_tax = db.Column(db.Numeric(10, 2))
    statements_shipping_tax = db.Column(db.Numeric(10, 2))
    statements_gift_wrap_tax = db.Column(db.Numeric(10, 2))
    statements_item_promotion_discount = db.Column(db.Numeric(10, 2))
    statements_ship_promotion_discount = db.Column(db.Numeric(10, 2))
    statements_promotion_deal_coupon_fees_allocated = db.Column(db.Numeric(10, 2))
    statements_commission = db.Column(db.Numeric(10, 2))
    statements_sponsored_products_charge_allocated = db.Column(db.Numeric(10, 2))
    statements_sales_tax_service_fee = db.Column(db.Numeric(10, 2))
    statements_marketplace_facilitator_tax_principal = db.Column(db.Numeric(10, 2))
    statements_marketplace_facilitator_tax_shipping = db.Column(db.Numeric(10, 2))
    statements_digital_services_fee = db.Column(db.Numeric(10, 2))
    statements_fba_fulfillment_fee = db.Column(db.Numeric(10, 2))
    statements_fba_storage_fee_allocated = db.Column(db.Numeric(10, 2))
    statements_fbm_shipping_commission = db.Column(db.Numeric(10, 2))
    statements_subscription_fee_allocated = db.Column(db.Numeric(10, 2))
    statements_order_other = db.Column(db.Numeric(10, 2))
    return_settlement_id = db.Column(db.String)
    return_deposit_date_pst_pdt = db.Column(db.DateTime)
    return_posted_date_pst_pdt = db.Column(db.DateTime)
    returns_item_price = db.Column(db.Numeric(10, 2))
    returns_item_price_goodwill_adjustment = db.Column(db.Numeric(10, 2))
    returns_shipping_price = db.Column(db.Numeric(10, 2))
    returns_shipping_chargeback = db.Column(db.Numeric(10, 2))
    returns_gift_wrap_price = db.Column(db.Numeric(10, 2))
    returns_gift_wrap_chargeback = db.Column(db.Numeric(10, 2))
    returns_item_tax = db.Column(db.Numeric(10, 2))
    returns_shipping_tax = db.Column(db.Numeric(10, 2))
    returns_gift_wrap_tax = db.Column(db.Numeric(10, 2))
    returns_item_promotion_discount = db.Column(db.Numeric(10, 2))
    returns_ship_promotion_discount = db.Column(db.Numeric(10, 2))
    returns_commission = db.Column(db.Numeric(10, 2))
    returns_digital_services_fee = db.Column(db.Numeric(10, 2))
    returns_fbm_shipping_commission = db.Column(db.Numeric(10, 2))
    returns_marketplace_facilitator_tax_principal = db.Column(db.Numeric(10, 2))
    returns_marketplace_facilitator_tax_shipping = db.Column(db.Numeric(10, 2))
    returns_refund_commission = db.Column(db.Numeric(10, 2))
    statements_return_other = db.Column(db.Numeric(10, 2))
    statements_other_allocated = db.Column(db.Numeric(10, 2))
    statements_promotion_deal_coupon_fees = db.Column(db.Numeric(10, 2))
    statements_sponsored_products_charge = db.Column(db.Numeric(10, 2))
    statements_fba_storage_fee = db.Column(db.Numeric(10, 2))
    statements_subscription_fee = db.Column(db.Numeric(10, 2))
    statements_other = db.Column(db.Numeric(10, 2))
    statements_non_sku_adjustments = db.Column(db.Numeric(10, 2))
    
    def to_dict(self):
        return {
            'id': self.id,
            'sales_status': self.sales_status,
            'sales_channel': self.sales_channel,
            'fulfillment_channel': self.fulfillment_channel,
            'product_type': self.product_type,
            'payment_status': self.payment_status,
            'return_status': self.return_status,
            'amazon_order_id': self.amazon_order_id,
            'sku': self.sku,
            'quantity': self.quantity,
            'purchase_date_pst_pdt': self.purchase_date_pst_pdt.isoformat() if self.purchase_date_pst_pdt else None,
            'data_month_last_day': self.data_month_last_day.isoformat() if self.data_month_last_day else None,
            'currency': self.currency,
            'item_price': str(self.item_price) if self.item_price else None,
            'shipping_price': str(self.shipping_price) if self.shipping_price else None,
            'gift_wrap_price': str(self.gift_wrap_price) if self.gift_wrap_price else None,
            'item_tax': str(self.item_tax) if self.item_tax else None,
            'shipping_tax': str(self.shipping_tax) if self.shipping_tax else None,
            'gift_wrap_tax': str(self.gift_wrap_tax) if self.gift_wrap_tax else None,
            'item_promotion_discount': str(self.item_promotion_discount) if self.item_promotion_discount else None,
            'ship_promotion_discount': str(self.ship_promotion_discount) if self.ship_promotion_discount else None,
            'commission': str(self.commission) if self.commission else None,
            'sponsored_products_charge': str(self.sponsored_products_charge) if self.sponsored_products_charge else None,
            'sales_tax_service_fee': str(self.sales_tax_service_fee) if self.sales_tax_service_fee else None,
            'marketplace_facilitator_tax_principal': str(self.marketplace_facilitator_tax_principal) if self.marketplace_facilitator_tax_principal else None,
            'marketplace_facilitator_tax_shipping': str(self.marketplace_facilitator_tax_shipping) if self.marketplace_facilitator_tax_shipping else None,
            'digital_services_fee': str(self.digital_services_fee) if self.digital_services_fee else None,
            'fba_fulfillment_fee': str(self.fba_fulfillment_fee) if self.fba_fulfillment_fee else None,
            'fba_inbound_transportation_fee': str(self.fba_inbound_transportation_fee) if self.fba_inbound_transportation_fee else None,
            'fba_storage_fee': str(self.fba_storage_fee) if self.fba_storage_fee else None,
            'fbm_shipping_commission': str(self.fbm_shipping_commission) if self.fbm_shipping_commission else None,
            'subscription_fee': str(self.subscription_fee) if self.subscription_fee else None,
            'order_settlement_id': self.order_settlement_id,
            'order_deposit_date_pst_pdt': self.order_deposit_date_pst_pdt.isoformat() if self.order_deposit_date_pst_pdt else None,
            'order_posted_date_pst_pdt': self.order_posted_date_pst_pdt.isoformat() if self.order_posted_date_pst_pdt else None,
            'non_order_settlement_id': self.non_order_settlement_id,
            'non_order_deposit_date_pst_pdt': self.non_order_deposit_date_pst_pdt.isoformat() if self.non_order_deposit_date_pst_pdt else None,
            'non_order_posted_date_pst_pdt': self.non_order_posted_date_pst_pdt.isoformat() if self.non_order_posted_date_pst_pdt else None,
            'statements_item_price': str(self.statements_item_price) if self.statements_item_price else None,
            'statements_shipping_price': str(self.statements_shipping_price) if self.statements_shipping_price else None,
            'statements_shipping_chargeback': str(self.statements_shipping_chargeback) if self.statements_shipping_chargeback else None,
            'statements_gift_wrap_price': str(self.statements_gift_wrap_price) if self.statements_gift_wrap_price else None,
            'statements_gift_wrap_chargeback': str(self.statements_gift_wrap_chargeback) if self.statements_gift_wrap_chargeback else None,
            'statements_item_tax': str(self.statements_item_tax) if self.statements_item_tax else None,
            'statements_shipping_tax': str(self.statements_shipping_tax) if self.statements_shipping_tax else None,
            'statements_gift_wrap_tax': str(self.statements_gift_wrap_tax) if self.statements_gift_wrap_tax else None,
            'statements_item_promotion_discount': str(self.statements_item_promotion_discount) if self.statements_item_promotion_discount else None,
            'statements_ship_promotion_discount': str(self.statements_ship_promotion_discount) if self.statements_ship_promotion_discount else None,
            'statements_promotion_deal_coupon_fees_allocated': str(self.statements_promotion_deal_coupon_fees_allocated) if self.statements_promotion_deal_coupon_fees_allocated else None,
            'statements_commission': str(self.statements_commission) if self.statements_commission else None,
            'statements_sponsored_products_charge_allocated': str(self.statements_sponsored_products_charge_allocated) if self.statements_sponsored_products_charge_allocated else None,
            'statements_sales_tax_service_fee': str(self.statements_sales_tax_service_fee) if self.statements_sales_tax_service_fee else None,
            'statements_marketplace_facilitator_tax_principal': str(self.statements_marketplace_facilitator_tax_principal) if self.statements_marketplace_facilitator_tax_principal else None,
            'statements_marketplace_facilitator_tax_shipping': str(self.statements_marketplace_facilitator_tax_shipping) if self.statements_marketplace_facilitator_tax_shipping else None,
            'statements_digital_services_fee': str(self.statements_digital_services_fee) if self.statements_digital_services_fee else None,
            'statements_fba_fulfillment_fee': str(self.statements_fba_fulfillment_fee) if self.statements_fba_fulfillment_fee else None,
            'statements_fba_storage_fee_allocated': str(self.statements_fba_storage_fee_allocated) if self.statements_fba_storage_fee_allocated else None,
            'statements_fbm_shipping_commission': str(self.statements_fbm_shipping_commission) if self.statements_fbm_shipping_commission else None,
            'statements_subscription_fee_allocated': str(self.statements_subscription_fee_allocated) if self.statements_subscription_fee_allocated else None,
            'statements_order_other': str(self.statements_order_other) if self.statements_order_other else None,
            'return_settlement_id': self.return_settlement_id,
            'return_deposit_date_pst_pdt': self.return_deposit_date_pst_pdt.isoformat() if self.return_deposit_date_pst_pdt else None,
            'returns_item_price': str(self.returns_item_price) if self.returns_item_price else None,
            'returns_item_price_goodwill_adjustment': str(self.returns_item_price_goodwill_adjustment) if self.returns_item_price_goodwill_adjustment else None,
            'returns_shipping_price': str(self.returns_shipping_price) if self.returns_shipping_price else None,
            'returns_shipping_chargeback': str(self.returns_shipping_chargeback) if self.returns_shipping_chargeback else None,
            'returns_gift_wrap_price': str(self.returns_gift_wrap_price) if self.returns_gift_wrap_price else None,
            'returns_gift_wrap_chargeback': str(self.returns_gift_wrap_chargeback) if self.returns_gift_wrap_chargeback else None,
            'returns_item_tax': str(self.returns_item_tax) if self.returns_item_tax else None,
            'returns_shipping_tax': str(self.returns_shipping_tax) if self.returns_shipping_tax else None,
            'returns_gift_wrap_tax': str(self.returns_gift_wrap_tax) if self.returns_gift_wrap_tax else None,
            'returns_item_promotion_discount': str(self.returns_item_promotion_discount) if self.returns_item_promotion_discount else None,
            'returns_ship_promotion_discount': str(self.returns_ship_promotion_discount) if self.returns_ship_promotion_discount else None,
            'returns_commission': str(self.returns_commission) if self.returns_commission else None,
            'returns_digital_services_fee': str(self.returns_digital_services_fee) if self.returns_digital_services_fee else None,
            'returns_fbm_shipping_commission': str(self.returns_fbm_shipping_commission) if self.returns_fbm_shipping_commission else None,
            'returns_marketplace_facilitator_tax_principal': str(self.returns_marketplace_facilitator_tax_principal) if self.returns_marketplace_facilitator_tax_principal else None,
            'returns_marketplace_facilitator_tax_shipping': str(self.returns_marketplace_facilitator_tax_shipping) if self.returns_marketplace_facilitator_tax_shipping else None,
            'returns_refund_commission': str(self.returns_refund_commission) if self.returns_refund_commission else None,
            'statements_return_other': str(self.statements_return_other) if self.statements_return_other else None,
            'statements_other_allocated': str(self.statements_other_allocated) if self.statements_other_allocated else None,
            'statements_promotion_deal_coupon_fees': str(self.statements_promotion_deal_coupon_fees) if self.statements_promotion_deal_coupon_fees else None,
            'statements_sponsored_products_charge': str(self.statements_sponsored_products_charge) if self.statements_sponsored_products_charge else None,
            'statements_fba_storage_fee': str(self.statements_fba_storage_fee) if self.statements_fba_storage_fee else None,
            'statements_subscription_fee': str(self.statements_subscription_fee) if self.statements_subscription_fee else None,
            'statements_other': str(self.statements_other) if self.statements_other else None,
            'statements_non_sku_adjustments': str(self.statements_non_sku_adjustments) if self.statements_non_sku_adjustments else None
        }

class QBAccountIDMapping(db.Model):
    __tablename__ = 'qbaccountidmapping'
    
    id = db.Column(db.Integer, primary_key=True)
    statement_category = db.Column(db.String, nullable=False)
    statement_pnl_items = db.Column(db.String, nullable=False)
    pnl_account_name = db.Column(db.String)
    pnl_account_id = db.Column(db.BigInteger)
    bs_account_name = db.Column(db.String)
    bs_account_id = db.Column(db.BigInteger)
    
    def to_dict(self):
        return {
            'id': self.id,
            'statement_category': self.statement_category,
            'statement_pnl_items': self.statement_pnl_items,
            'pnl_account_name': self.pnl_account_name,
            'pnl_account_id': self.pnl_account_id,
            'bs_account_name': self.bs_account_name,
            'bs_account_id': self.bs_account_id
        }
