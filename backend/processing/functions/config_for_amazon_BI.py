
import os
import numpy as np

commission_rate = 0.1172
sales_tax_service_fee_rate = 0
marketplace_facilitator_tax_principal_rate = 1
marketplace_facilitator_tax_shipping_rate = 1
FBM_shipping_commission_rate = 0.12
digital_services_fee_rate = 0
subscription_fee = 38

hardware_names = ['ADATA']
hardware_names_pattern = '|'.join(hardware_names) if hardware_names else r'^(?!x)x'

keep_columns_statement_summary = [
    'settlement_id', 'deposit_date_pst_pdt',
    'total_amount','currency'
    ]

keep_columns_statement_details = [
    'settlement_id','transaction_type', 'order_id', 'marketplace_name', 
    'amount_type', 'amount_description', 'amount', 
    'posted_date_time_pst_pdt',
    'sku', 'quantity_purchased'
    ]

keep_columns_all_orders_joined_with_sku_economics = [
    'Data Month First Day', 'Data Month Last Day',
    'sales_status',
    'amazon_order_id', 'purchase_date_pst_pdt', 'purchase_date', 'fulfillment_channel', 'sales_channel', 'currency',
    'sku', 'quantity', 
    'total_quantity_per_sku_per_month', 'total_quantity_per_month', 'total_quantity_per_sku_per_day','total_quantity_per_month_FBA_only',
    'item_price', 'item_tax',
    'shipping_price', 'shipping_tax', 
    'gift_wrap_price', 'gift_wrap_tax',
    'item_promotion_discount', 'ship_promotion_discount',
    'FBA_fulfillment_fees_total',
    'sponsored_products_charge_total',
    'monthly_inventory_storage_fee_total'
    ]

ordered_columns_all_orders_PnL = [
    'Data Month First Day', 'Data Month Last Day',
    'sales_status', 'Product Type',
    'amazon_order_id', 'purchase_date_pst_pdt', 'fulfillment_channel', 'sales_channel', 'currency',
    'sku', 'quantity', 
    'total_quantity_per_sku_per_month', 'total_quantity_per_month', 'total_quantity_per_month_FBA_only',
    'item_price', 'shipping_price', 'gift_wrap_price',
    'item_tax', 'shipping_tax', 'gift_wrap_tax',
    'item_promotion_discount', 'ship_promotion_discount',
    'Commission', 'Sponsored Products Charge',
    'Sales Tax Service Fee', 'marketplace_facilitator_tax_principal', 'marketplace_facilitator_tax_shipping', 'Digital Services Fee',
    'FBA Fulfillment Fee', 'FBA Inbound Transportation Fee', 'Storage Fee', 'FBM Shipping Commission',
    'Subscription Fee' 
    ]

rename_dict_all_orders_PnL = {
    'Data Month First Day': 'data_month_first_day',
    'Data Month Last Day': 'data_month_last_day',
    'sales_status': 'sales_status', 
    'Product Type': 'product_type',
    'amazon_order_id': 'amazon_order_id', 
    'purchase_date_pst_pdt': 'purchase_date_pst_pdt', 
    'fulfillment_channel': 'fulfillment_channel', 
    'sales_channel': 'sales_channel', 
    'currency': 'currency',
    'sku': 'sku', 
    'quantity': 'quantity', 
    'total_quantity_per_sku_per_month': 'total_quantity_per_sku_per_month', 
    'total_quantity_per_month': 'total_quantity_per_month',
    'total_quantity_per_month_FBA_only': 'total_quantity_per_month_FBA_only',
    'item_price': 'item_price', 
    'shipping_price': 'shipping_price', 
    'gift_wrap_price': 'gift_wrap_price',
    'item_tax': 'item_tax', 
    'shipping_tax': 'shipping_tax', 
    'gift_wrap_tax': 'gift_wrap_tax',
    'item_promotion_discount': 'item_promotion_discount', 
    'ship_promotion_discount': 'ship_promotion_discount',
    'Commission': 'commission', 
    'Sponsored Products Charge': 'sponsored_products_charge',
    'Sales Tax Service Fee': 'sales_tax_service_fee', 
    'marketplace_facilitator_tax_principal': 'marketplace_facilitator_tax_principal',
    'marketplace_facilitator_tax_shipping': 'marketplace_facilitator_tax_shipping',
    'Digital Services Fee': 'digital_services_fee',
    'FBA Fulfillment Fee': 'FBA_fulfillment_fee', 
    'FBA Inbound Transportation Fee': 'FBA_inbound_transportation_fee', 
    'Storage Fee': 'FBA_storage_fee',
    'FBM Shipping Commission': 'FBM_shipping_commission',
    'Subscription Fee': 'subscription_fee'
    }

columns_to_negate_all_orders_PnL = [
    'item_promotion_discount', 'ship_promotion_discount',
    'commission', 'sponsored_products_charge',
    'sales_tax_service_fee', 'marketplace_facilitator_tax_principal', 'marketplace_facilitator_tax_shipping', 'digital_services_fee',
    'FBA_fulfillment_fee', 'FBA_inbound_transportation_fee', 'FBA_storage_fee', 'FBM_shipping_commission',
    'subscription_fee'
    ]

statement_order_rename_dict = {
    'settlement_id': 'order_settlement_id',
    'deposit_date_pst_pdt': 'order_deposit_date_pst_pdt',
    'posted_date_time_pst_pdt': 'order_posted_date_time_pst_pdt',
    'order_id': 'amazon_order_id',
    'sku': 'sku',

    'ItemPrice: Principal': 'statements_item_price',

    'ItemPrice: Shipping': 'statements_shipping_price',
    'ItemFees: ShippingChargeback': 'statements_shipping_chargeback',

    'ItemPrice: GiftWrap': 'statements_gift_wrap_price',
    'ItemFees: GiftwrapChargeback': 'statements_gift_wrap_chargeback',

    'ItemPrice: Tax': 'statements_item_tax',
    'ItemPrice: ShippingTax': 'statements_shipping_tax',
    'ItemPrice: GiftWrapTax': 'statements_gift_wrap_tax',

    'Promotion: Principal': 'statements_item_promotion_discount',
    'Promotion: Shipping': 'statements_ship_promotion_discount',

    'ItemFees: Commission': 'statements_commission',
    'ItemFees: SalesTaxServiceFee': 'statements_sales_tax_service_fee',
    'ItemFees: DigitalServicesFee': 'statements_digital_services_fee',

    'ItemFees: FBAPerUnitFulfillmentFee': 'statements_FBA_fulfillment_fee',
    'ItemFees: ShippingHB': 'statements_FBM_shipping_commission',
        
    'ItemWithheldTax: MarketplaceFacilitatorTax-Principal': 'statements_marketplace_facilitator_tax_principal',	
    'ItemWithheldTax: MarketplaceFacilitatorTax-Shipping': 'statements_marketplace_facilitator_tax_shipping'
    }

statement_return_rename_dict = {
    'settlement_id': 'return_settlement_id',
    'deposit_date_pst_pdt': 'return_deposit_date_pst_pdt',
    'posted_date_time_pst_pdt': 'return_posted_date_time_pst_pdt',
    'order_id': 'amazon_order_id',
    'sku': 'sku',

    'ItemPrice: Principal': 'returns_item_price',
    'ItemPrice: Goodwill': 'returns_item_price_goodwill_adjustment',

    'ItemPrice: Shipping': 'returns_shipping_price',
    'ItemFees: ShippingChargeback': 'returns_shipping_chargeback',

    'ItemPrice: GiftWrap': 'returns_gift_wrap_price',
    'ItemFees: GiftwrapChargeback': 'returns_gift_wrap_chargeback',

    'ItemPrice: Tax': 'returns_item_tax',
    'ItemPrice: ShippingTax': 'returns_shipping_tax',
    'ItemPrice: GiftWrapTax': 'returns_gift_wrap_tax',

    'Promotion: Principal': 'returns_item_promotion_discount',
    'Promotion: Shipping': 'returns_ship_promotion_discount',

    'ItemFees: Commission': 'returns_commission',
    'ItemFees: DigitalServicesFee': 'returns_digital_services_fee',
    'ItemFees: ShippingHB': 'returns_FBM_shipping_commission',
    
    'ItemWithheldTax: MarketplaceFacilitatorTax-Principal': 'returns_marketplace_facilitator_tax_principal',
    'ItemWithheldTax: MarketplaceFacilitatorTax-Shipping': 'returns_marketplace_facilitator_tax_shipping',

    'ItemFees: RefundCommission': 'returns_refund_commission'
    }

statement_details_non_order_related_remove = [
    'other-transaction: Previous Reserve Amount Balance',
    'other-transaction: Current Reserve Amount',
    'other-transaction: Payable to Amazon',
    'other-transaction: Successful charge',
    'Micro Deposit: Micro Deposit',
    'other-transaction: FBAInboundTransportationFee',

    'FBA Inventory Reimbursement: COMPENSATED_CLAWBACK',
    'FBA Inventory Reimbursement: MISSING_FROM_INBOUND',
    'FBA Inventory Reimbursement: WAREHOUSE_DAMAGE',
    'FBA Inventory Reimbursement: WAREHOUSE_LOST',
    'FBA Inventory Reimbursement: REVERSAL_REIMBURSEMENT',
    'other-transaction: BuyerRecharge',
    'other-transaction: NonSubscriptionFeeAdj'
    ]
    
statement_details_non_order_related_rename_dict_interim = {
    'other-transaction: Storage Fee': 'statements_FBA_storage_fee_a',
    'other-transaction: StorageRenewalBilling': 'statements_FBA_storage_fee_b'
    }

statement_details_non_order_related_rename_dict = {
	'Data Month Last Day': 'data_month_last_day',
    'settlement_id': 'non_order_settlement_id',
    'deposit_date_pst_pdt': 'non_order_deposit_date_pst_pdt',
    'posted_date_time_pst_pdt': 'non_order_posted_date_time_pst_pdt',
    'Cost of Advertising: TransactionTotalAmount': 'statements_sponsored_products_charge',
    'statements_FBA_storage_fee': 'statements_FBA_storage_fee',
    'other-transaction: Subscription Fee': 'statements_subscription_fee',
    'Promotion/LightningDeal/CouponRedemption Fees': 'statements_promotion_deal_coupon_fees',
    }

final_all_orders_PnL = [
    'sales_status', 'sales_channel', 'fulfillment_channel', 'product_type', 
    'payment_status', 'return_status',

    'amazon_order_id', 'sku', 'quantity', 
    'purchase_date_pst_pdt', 'data_month_last_day',
    'currency',
    'item_price', 'shipping_price', 'gift_wrap_price',
    'item_tax', 'shipping_tax', 'gift_wrap_tax',
    'item_promotion_discount', 'ship_promotion_discount',
    'commission', 'sponsored_products_charge',
    'sales_tax_service_fee', 'marketplace_facilitator_tax_principal', 'marketplace_facilitator_tax_shipping', 'digital_services_fee',
    'FBA_fulfillment_fee', 'FBA_inbound_transportation_fee', 'FBA_storage_fee',
    'FBM_shipping_commission',
    'subscription_fee',

    'order_settlement_id', 'order_deposit_date_pst_pdt', 'order_posted_date_pst_pdt',
    'non_order_settlement_id', 'non_order_deposit_date_pst_pdt', 'non_order_posted_date_pst_pdt',
    'statements_item_price', 'statements_shipping_price', 'statements_shipping_chargeback', 'statements_gift_wrap_price', 'statements_gift_wrap_chargeback',
    'statements_item_tax', 'statements_shipping_tax', 'statements_gift_wrap_tax',
    'statements_item_promotion_discount', 'statements_ship_promotion_discount', 'statements_promotion_deal_coupon_fees_allocated',
    'statements_commission', 'statements_sponsored_products_charge_allocated',
    'statements_sales_tax_service_fee', 'statements_marketplace_facilitator_tax_principal',	'statements_marketplace_facilitator_tax_shipping', 'statements_digital_services_fee',
    'statements_FBA_fulfillment_fee', 'statements_FBA_storage_fee_allocated',
    'statements_FBM_shipping_commission',
    'statements_subscription_fee_allocated',

    'statements_order_other',

    'return_settlement_id', 'return_deposit_date_pst_pdt', 'return_posted_date_pst_pdt',
    'returns_item_price', 'returns_item_price_goodwill_adjustment', 'returns_shipping_price', 'returns_shipping_chargeback', 'returns_gift_wrap_price', 'returns_gift_wrap_chargeback',
    'returns_item_tax', 'returns_shipping_tax', 'returns_gift_wrap_tax',
    'returns_item_promotion_discount', 'returns_ship_promotion_discount',
    'returns_commission', 'returns_digital_services_fee',
    'returns_FBM_shipping_commission',
    'returns_marketplace_facilitator_tax_principal', 'returns_marketplace_facilitator_tax_shipping',
    'returns_refund_commission',
    'statements_return_other',

    'statements_other_allocated',

    'statements_promotion_deal_coupon_fees','statements_sponsored_products_charge','statements_FBA_storage_fee','statements_subscription_fee', 'statements_other'
    ]

statement_details_non_sku_related_items = [
    'FBA Inventory Reimbursement: COMPENSATED_CLAWBACK',
    'FBA Inventory Reimbursement: MISSING_FROM_INBOUND',
    'FBA Inventory Reimbursement: WAREHOUSE_DAMAGE',
    'FBA Inventory Reimbursement: WAREHOUSE_LOST',
    'FBA Inventory Reimbursement: REVERSAL_REIMBURSEMENT',
    'other-transaction: BuyerRecharge',
    'other-transaction: NonSubscriptionFeeAdj'
    ]