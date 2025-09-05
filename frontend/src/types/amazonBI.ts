export interface AmazonOrder {
  id?: number;
  amazon_order_id: string;
  purchase_date_utc: string;
  purchase_date_pst_pdt: string;
  order_status: string;
  fulfillment_channel: string;
  sales_channel: string;
  sku: string;
  item_status: string;
  quantity: number;
  currency: string | null;
  item_price: number | null;
  item_tax: number | null;
  shipping_price: number | null;
  shipping_tax: number | null;
  gift_wrap_price: number | null;
  gift_wrap_tax: number | null;
  item_promotion_discount: number | null;
  ship_promotion_discount: number | null;
}

export interface CreateAmazonOrderDto {
  amazon_order_id: string;
  purchase_date_utc: string;
  order_status: string;
  fulfillment_channel: string;
  sales_channel: string;
  sku: string;
  item_status: string;
  quantity: number;
  currency?: string | null;
  item_price?: number | null;
  item_tax?: number | null;
  shipping_price?: number | null;
  shipping_tax?: number | null;
  gift_wrap_price?: number | null;
  gift_wrap_tax?: number | null;
  item_promotion_discount?: number | null;
  ship_promotion_discount?: number | null;
}

export interface SKUEconomics {
  id?: number;
  amazon_store: string;
  start_date_pst_pdt: string;
  end_date_pst_pdt: string;
  MSKU: string;
  currency_code: string;
  FBA_fulfillment_fees_total: number | null;
  sponsored_products_charge_total: number | null;
  monthly_inventory_storage_fee_total: number | null;
  inbound_transportation_charge_total: number | null;
}

export interface CreateSKUEconomicsDto {
  amazon_store: string;
  start_date_pst_pdt: string;
  end_date_pst_pdt: string;
  MSKU: string;
  currency_code: string;
  FBA_fulfillment_fees_total?: number | null;
  sponsored_products_charge_total?: number | null;
  monthly_inventory_storage_fee_total?: number | null;
  inbound_transportation_charge_total?: number | null;
}

export interface AmazonInboundShipping {
  id?: number;
  shipment_name: string;
  shipment_id: string;
  created_pst_pdt: string | null;
  last_updated_pst_pdt: string | null;
  ship_to: string | null;
  units_expected: number | null;
  units_located: number | null;
  status: string | null;
  amazon_partnered_carrier_cost: number | null;
  currency: string | null;
  MSKU: string | null;
}

export interface CreateAmazonInboundShippingDto {
  shipment_name: string;
  shipment_id: string;
  created_pst_pdt?: string | null;
  last_updated_pst_pdt?: string | null;
  ship_to?: string | null;
  units_expected?: number | null;
  units_located?: number | null;
  status?: string | null;
  amazon_partnered_carrier_cost?: number | null;
  currency?: string | null;
  MSKU?: string | null;
}

export interface AmazonStatement {
  id?: number;
  settlement_id: string;
  settlement_start_date_utc: string | null;
  settlement_start_date_pst_pdt: string | null;
  settlement_end_date_utc: string | null;
  settlement_end_date_pst_pdt: string | null;
  deposit_date_utc: string | null;
  deposit_date_pst_pdt: string | null;
  total_amount: number | null;
  currency: string | null;
  transaction_type: string | null;
  order_id: string | null;
  marketplace_name: string | null;
  amount_type: string | null;
  amount_description: string | null;
  amount: number | null;
  posted_date_time_utc: string | null;
  posted_date_time_pst_pdt: string | null;
  sku: string | null;
  quantity_purchased: number | null;
}

export interface CreateAmazonStatementDto {
  settlement_id: string;
  settlement_start_date_utc?: string | null;
  settlement_end_date_utc?: string | null;
  deposit_date_utc?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  transaction_type?: string | null;
  order_id?: string | null;
  marketplace_name?: string | null;
  amount_type?: string | null;
  amount_description?: string | null;
  amount?: number | null;
  posted_date_time_utc?: string | null;
  sku?: string | null;
  quantity_purchased?: number | null;
}

export interface FBMShippingCost {
  id?: number;
  order_id: string;
  shipping_id: string;
  shipping_cost: number | null;
  source: string | null;
  payment_date: string | null;
}

export interface CreateFBMShippingCostDto {
  order_id: string;
  shipping_id: string;
  shipping_cost?: number | null;
  source?: string | null;
  payment_date?: string | null;
}

export interface AdsSpendByDay {
  id?: number;
  date_by_day: string;
  sku: string;
  spend: number | null;
}

export interface CreateAdsSpendByDayDto {
  date_by_day: string;
  sku: string;
  spend?: number | null;
}

export interface AdsCreditCardPayment {
  id?: number;
  invoice_id: string;
  issued_on: string;
  due_date: string;
  total_amount_billed: number;
}

export interface CreateAdsCreditCardPaymentDto {
  invoice_id: string;
  issued_on: string;
  due_date: string;
  total_amount_billed: number;
}

export interface QBAccountIDMapping {
  id?: number;
  statement_category: string;
  statement_pnl_items: string;
  pnl_account_name?: string | null;
  pnl_account_id?: number | null;
  bs_account_name?: string | null;
  bs_account_id?: number | null;
}

export interface CreateQBAccountIDMappingDto {
  statement_category: string;
  statement_pnl_items: string;
  pnl_account_name?: string | null;
  pnl_account_id?: number | null;
  bs_account_name?: string | null;
  bs_account_id?: number | null;
} 