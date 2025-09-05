
import os
import numpy as np

commission_rate = 0.1172
sales_tax_service_fee_rate = 0
marketplace_facilitator_tax_principal_rate = 1
marketplace_facilitator_tax_shipping_rate = 1
FBM_shipping_commission_rate = 0.12
digital_services_fee_rate = 0
subscription_fee = 38

inbound_shipping_file_name = 'Inbound Shipping.csv'

keep_columns_statement_summary = [
    'settlement-id', 'settlement-start-date-PST-PDT', 'settlement-end-date-PST-PDT',
    'deposit-date-UTC', 'deposit-date-PST-PDT',
    'total-amount','currency'
    ]

keep_columns_statement_details = [
    'settlement-id','transaction-type', 'order-id', 'marketplace-name', 
    'amount-type', 'amount-description', 'amount', 
    'posted-date-time', 'posted-date-UTC', 'posted-date-PST-PDT',
    'sku', 'quantity-purchased'
    ]

must_have_columns_statement_details_pivoted = [
    'marketplace-name', 
    'settlement-id', 'settlement-start-date-PST-PDT', 'settlement-end-date-PST-PDT', 
    'deposit-date-UTC', 'deposit-date-PST-PDT', 
    'posted-date-time', 'posted-date-UTC', 'posted-date-PST-PDT', 
    'transaction-type',
    'order-id', 'all order PnL Date', 'sku', 'quantity-purchased',
    'ItemPrice: Principal', 'ItemPrice: Shipping', 'ItemPrice: GiftWrap','ItemPrice: Tax', 'ItemPrice: ShippingTax', 'ItemPrice: GiftWrapTax',
    'ItemFees: Commission', 'ItemFees: FBAPerUnitFulfillmentFee', 'ItemFees: SalesTaxServiceFee', 'ItemFees: ShippingHB', 'ItemFees: DigitalServicesFee',
    'Promotion: Principal', 'Promotion: Shipping', 'Cost of Advertising: TransactionTotalAmount',
    'other-transaction: FBAInboundTransportationFee', 'other-transaction: Storage Fee', 'other-transaction: Subscription Fee',
    'ItemFees: ShippingChargeback', 'ItemWithheldTax: MarketplaceFacilitatorTax-Principal', 'ItemWithheldTax: MarketplaceFacilitatorTax-Shipping'
    ]

rename_dict = {
    'sku': 'SKU',
    'sales_status': 'Sales Status',
    'quantity': 'Units Sold',
    'item-price': 'Sales Principal',
    'shipping-price': 'Shipping',
    'gift-wrap-price': 'Gift Wrap',
    'item-tax': 'Sales Tax',
    'shipping-tax': 'Shipping Tax',
    'gift-wrap-tax': 'Gift Wrap Tax',
    'item-promotion-discount': 'Product Sales Promotion',
    'ship-promotion-discount': 'Shipping Promotion'
    }

ordered_columns_all_orders_PnL = [
    'sales_status', 
    'amazon-order-id', 'purchase-date', 'purchase-date-UTC', 'purchase-date-PST-PDT', 'Data Month Last Day',
    'order-status', 'fulfillment-channel', 'sales-channel', 'currency',
    'sku', 'item-status', 'quantity', 'total_quantity_per_sku_per_month', 'total_quantity_per_month',
    'item-price', 
    'shipping-price', 'gift-wrap-price',
    'item-tax', 'shipping-tax', 'gift-wrap-tax',
    'item-promotion-discount', 'ship-promotion-discount',
    'FBA fulfilment fees total', 'Sponsored Products charge total', 'Monthly inventory storage fee total', 
    'Units expected', 'Inbound transportation charge total',
    'Commission', 'FBA Fulfillment Fee', 'Sales Tax Service Fee', 
    'Marketplace Facilitator Tax Principal', 'Marketplace Facilitator Tax Shipping',
    'FBM Shipping Commission', 'Digital Services Fee',
    'Sponsored Products Charge', 'Advertising Fee for Sales', 'Advertising Fee for Non-Sales',
    'FBA Inbound Transportation Fee', 'Subscription Fee', 'Storage Fee'
    ]

columns_to_sum_all_orders_PnL = [
    'item-price', 
    'shipping-price', 'gift-wrap-price',
    'item-tax', 'shipping-tax', 'gift-wrap-tax',
    'Commission', 'FBA Fulfillment Fee', 'Sales Tax Service Fee', 
    'Marketplace Facilitator Tax Principal', 'Marketplace Facilitator Tax Shipping',
    'FBM Shipping Commission', 'Digital Services Fee',
    'Sponsored Products Charge', 'Advertising Fee for Sales', 'Advertising Fee for Non-Sales',
    'item-promotion-discount', 'ship-promotion-discount',
    'FBA Inbound Transportation Fee', 'Subscription Fee', 'Storage Fee'
    ]

rows_rename_dict_all_orders_PnL_transposed = {
    'item-price': 'Sales Principal',
    'shipping-price': 'Shipping',
    'gift-wrap-price': 'Gift Wrap',
    'item-tax': 'Sales Tax',
    'shipping-tax': 'Shipping Tax',
    'gift-wrap-tax': 'Gift Wrap Tax',
    'item-promotion-discount': 'Product Sales Promotion',
    'ship-promotion-discount': 'Shipping Promotion'
    }

ordered_columns_sku_PnL = [
    'Sales Status', 'Product Type', 'SKU',
    'EBITA', 'Gross Margin', 'Revenue', 'Cost of Goods Sold', 'Operating Expense',
    'Units Sold', 
    'Sales Principal', 'PC Sales Principal', 'Components Sales Principal',
    'Shipping', 'Gift Wrap', 'Sales Tax', 
    'Shipping Tax', 'Gift Wrap Tax', 
    'Product Purchases', 
    'Commission', 'FBA Fulfillment Fee', 'Sales Tax Service Fee', 
    'Marketplace Facilitator Tax Principal', 'Marketplace Facilitator Tax Shipping',
    'FBM Shipping Commission', 'Digital Services Fee',
    'Sponsored Products Charge', 'Advertising Fee for Sales', 'Advertising Fee for Non-Sales',
    'Product Sales Promotion', 'Shipping Promotion',
    'FBA Inbound Transportation Fee', 'Subscription Fee', 'Storage Fee'
    ]

columns_to_negate_sku_PnL = [
    'Product Purchases',
    'Commission', 'FBA Fulfillment Fee', 'Sales Tax Service Fee', 
    'Marketplace Facilitator Tax Principal', 'Marketplace Facilitator Tax Shipping',
    'FBM Shipping Commission', 'Digital Services Fee',
    'Sponsored Products Charge', 'Advertising Fee for Sales', 'Advertising Fee for Non-Sales',
    'Product Sales Promotion', 'Shipping Promotion', 
    'FBA Inbound Transportation Fee', 'Subscription Fee', 'Storage Fee'
    ]

PnL_project_statement_always_try_to_adj_items = [        
    'Sales Principal',
    'Shipping', 'Gift Wrap',
    'Sales Tax', 'Shipping Tax', 'Gift Wrap Tax',
    'Commission', 'FBA Fulfillment Fee', 'Sales Tax Service Fee', 
    'Marketplace Facilitator Tax Principal', 'Marketplace Facilitator Tax Shipping',
    'FBM Shipping Commission', 'Digital Services Fee',
    'Sponsored Products Charge', 'Advertising Fee for Sales', 'Advertising Fee for Non-Sales',
    'Product Sales Promotion', 'Shipping Promotion',
    'FBA Inbound Transportation Fee', 'Subscription Fee', 'Storage Fee'
    ]

ordered_columns_Accrued_Adjusted_PnL = [
    'PnL Section', 'PnL Section I', 'PnL Section II', 'PnL Section III', 'PnL Section IV', 'PnL Section V',
    'Statement Category', 'Statement PnL Items', 'Statement Values',
    'Project PnL Items', 'Project PnL Paid', 'Project PnL Unpaid', 
    'Missing Items - Accrued PnL to Add', 
    'Adjustment Items - Accrued Adjusted PnL to Adjust', 
    'FBA Inbound Transportation Fee Diff to Balance Sheet Asset', 
    'Return Items - Accrued Adjusted PnL to Adjust', 
    'Accrued Adjusted Values'
    ]

PnL_mapping = {
    'Sales Principal': {'PnL Section I': 'Revenue', 'PnL Section II': 'Product Revenue', 'PnL Section III': 'Sales Principal', 'PnL Section IV': np.nan, 'PnL Section V': np.nan},
    'PC Sales Principal': {'PnL Section I': 'Revenue', 'PnL Section II': 'Product Revenue', 'PnL Section III': 'Sales Principal', 'PnL Section IV': 'PC Sales Principal', 'PnL Section V': np.nan},
    'Components Sales Principal': {'PnL Section I': 'Revenue', 'PnL Section II': 'Product Revenue', 'PnL Section III': 'Sales Principal', 'PnL Section IV': 'Components Sales Principal', 'PnL Section V': np.nan},
    'Shipping': {'PnL Section I': 'Revenue', 'PnL Section II': 'Product Revenue', 'PnL Section III': 'Shipping', 'PnL Section IV': np.nan, 'PnL Section V': np.nan},
    'Gift Wrap': {'PnL Section I': 'Revenue', 'PnL Section II': 'Product Revenue', 'PnL Section III': 'Gift Wrap', 'PnL Section IV': np.nan, 'PnL Section V': np.nan},
    'Sales Tax': {'PnL Section I': 'Revenue', 'PnL Section II': 'Tax Revenue', 'PnL Section III': 'Sales Tax', 'PnL Section IV': np.nan, 'PnL Section V': np.nan},
    'Shipping Tax': {'PnL Section I': 'Revenue', 'PnL Section II': 'Tax Revenue', 'PnL Section III': 'Shipping Tax', 'PnL Section IV': np.nan, 'PnL Section V': np.nan},
    'Gift Wrap Tax': {'PnL Section I': 'Revenue', 'PnL Section II': 'Tax Revenue', 'PnL Section III': 'Gift Wrap Tax', 'PnL Section IV': np.nan, 'PnL Section V': np.nan},
    'Commission': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Item Fees', 'PnL Section IV': 'Commission', 'PnL Section V': np.nan},
    'FBA Fulfillment Fee': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Item Fees', 'PnL Section IV': 'FBA Fulfillment Fee', 'PnL Section V': np.nan},
    'Sales Tax Service Fee': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Item Fees', 'PnL Section IV': 'Sales Tax Service Fee', 'PnL Section V': np.nan},
    'FBM Shipping Commission': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Item Fees', 'PnL Section IV': 'FBM Shipping Commission', 'PnL Section V': np.nan},
    'Digital Services Fee': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Item Fees', 'PnL Section IV': 'Digital Services Fee', 'PnL Section V': np.nan},
    'Sponsored Products Charge': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Marketing & Advertising', 'PnL Section IV': 'Sponsored Products Charge', 'PnL Section V': np.nan},
    'Advertising Fee for Sales': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Marketing & Advertising', 'PnL Section IV': 'Sponsored Products Charge', 'PnL Section V': 'Advertising Fee for Sales'},
    'Advertising Fee for Non-Sales': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Marketing & Advertising', 'PnL Section IV': 'Sponsored Products Charge', 'PnL Section V': 'Advertising Fee for Non-Sales'},
    'Product Sales Promotion': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Marketing & Advertising', 'PnL Section IV': 'Product Sales Promotion', 'PnL Section V': np.nan},
    'Shipping Promotion': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Marketing & Advertising', 'PnL Section IV': 'Shipping Promotion', 'PnL Section V': np.nan},
    'FBA Inbound Transportation Fee': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Other Transaction', 'PnL Section IV': 'FBA Inbound Transportation Fee', 'PnL Section V': np.nan},
    'Subscription Fee': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Other Transaction', 'PnL Section IV': 'Subscription Fee', 'PnL Section V': np.nan},
    'Storage Fee': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Other Transaction', 'PnL Section IV': 'Storage Fee', 'PnL Section V': np.nan},
    'ItemFees: ShippingChargeback': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Item Fees', 'PnL Section IV': 'Shipping Chargeback', 'PnL Section V': np.nan},
    'ItemWithheldTax: MarketplaceFacilitatorTax-Principal': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Marketplace Facilitator Fee', 'PnL Section IV': 'MarketplaceFacilitatorTax-Principal', 'PnL Section V': np.nan},
    'ItemWithheldTax: MarketplaceFacilitatorTax-Shipping': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Fees', 'PnL Section III': 'Marketplace Facilitator Fee', 'PnL Section IV': 'MarketplaceFacilitatorTax-Shipping', 'PnL Section V': np.nan},
    'Refunded Commission': {'PnL Section I': 'Revenue', 'PnL Section II': 'Other Revenue', 'PnL Section III': 'Returned Amazon Item Fees', 'PnL Section IV': 'Refunded Commission', 'PnL Section V': np.nan},
    'Refunded FBM Shipping Commission': {'PnL Section I': 'Revenue', 'PnL Section II': 'Other Revenue', 'PnL Section III': 'Returned Amazon Item Fees', 'PnL Section IV': 'Refunded FBM Shipping Commission', 'PnL Section V': np.nan},
    'Refunded Product Promotion': {'PnL Section I': 'Revenue', 'PnL Section II': 'Other Revenue', 'PnL Section III': 'Returned Amazon Marketing Expense', 'PnL Section IV': 'Refunded Product Promotion', 'PnL Section V': np.nan},
    'Refunded Shipping Promotion': {'PnL Section I': 'Revenue', 'PnL Section II': 'Other Revenue', 'PnL Section III': 'Returned Amazon Marketing Expense', 'PnL Section IV': 'Refunded Shipping Promotion', 'PnL Section V': np.nan},
    'Refunded Shipping Chargeback': {'PnL Section I': 'Revenue', 'PnL Section II': 'Other Revenue', 'PnL Section III': 'Returned Amazon Item Fees', 'PnL Section IV': 'Refunded Shipping Chargeback', 'PnL Section V': np.nan},
    'Refunded Marketplace Facilitator Tax - Principal': {'PnL Section I': 'Revenue', 'PnL Section II': 'Other Revenue', 'PnL Section III': 'Returned Marketplace Facilitator Fee', 'PnL Section IV': 'Refunded Marketplace Facilitator Tax - Principal', 'PnL Section V': np.nan},
    'Refunded Marketplace Facilitator Tax - Shipping': {'PnL Section I': 'Revenue', 'PnL Section II': 'Other Revenue', 'PnL Section III': 'Returned Marketplace Facilitator Fee', 'PnL Section IV': 'Refunded Marketplace Facilitator Tax - Shipping', 'PnL Section V': np.nan},
    'Return Product Revenue Reversal - Shipping': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Returns', 'PnL Section III': 'Return Product Revenue Reversal', 'PnL Section IV': 'Shipping', 'PnL Section V': np.nan},
    'Return Product Revenue Reversal - Gift Wrap': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Returns', 'PnL Section III': 'Return Product Revenue Reversal', 'PnL Section IV': 'Gift Wrap', 'PnL Section V': np.nan},
    'Return Product Revenue Reversal - Tax': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Returns', 'PnL Section III': 'Return Product Revenue Reversal', 'PnL Section IV': 'Tax', 'PnL Section V': np.nan},
    'Return Product Revenue Reversal - Shipping Tax': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Returns', 'PnL Section III': 'Return Product Revenue Reversal', 'PnL Section IV': 'Shipping Tax', 'PnL Section V': np.nan},
    'Return Product Revenue Reversal - Gift Wrap Tax': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Returns', 'PnL Section III': 'Return Product Revenue Reversal', 'PnL Section IV': 'Gift Wrap Tax', 'PnL Section V': np.nan},
    'ItemFees: RefundCommission': {'PnL Section I': 'Operating Expense', 'PnL Section II': 'Amazon Returns', 'PnL Section III': 'Refund Comission', 'PnL Section IV': np.nan, 'PnL Section V': np.nan},
    'Product Purchases': {'PnL Section I': 'Cost of Goods Sold', 'PnL Section II': 'Purchases', 'PnL Section III': 'Product Purchases', 'PnL Section IV': np.nan, 'PnL Section V': np.nan}
    }

order_PnL_Section_I = ['Revenue', 'Cost of Goods Sold', 'Operating Expense']
order_PnL_Section_II = ['Product Revenue', 'Tax Revenue', 'Other Revenue', 'Purchases', 'Amazon Fees', 'Amazon Returns']
order_PnL_Section_III = [
    'Sales Principal', 'Shipping', 'Gift Wrap', 'Sales Tax', 'Shipping Tax', 'Gift Wrap Tax',
    'Returned Amazon Item Fees', 'Returned Amazon Marketing Expense', 'Returned Marketplace Facilitator Fee',
    'Product Purchases', 'Item Fees', 'Marketing & Advertising', 'Marketplace Facilitator Fee',
    'Other Transaction', 'Return Product Revenue Reversal', 'Refund Comission'
    ]
order_PnL_Section_IV = [
    'Total',
    'PC Sales Principal', 'Components Sales Principal', 'Refunded Commission', 'Refunded Shipping Chargeback',
    'Refunded Product Promotion', 'Refunded Shipping Promotion', 'Refunded Marketplace Facilitator Tax - Principal',
    'Refunded Marketplace Facilitator Tax - Shipping', 'Commission', 'FBA Fulfillment Fee', 'Sales Tax Service Fee', 'FBM Shipping Commission', 'Digital Services Fee',
    'Shipping Chargeback', 'Sponsored Products Charge', 'Product Sales Promotion', 'Shipping Promotion',
    'MarketplaceFacilitatorTax-Principal', 'MarketplaceFacilitatorTax-Shipping', 'FBA Inbound Transportation Fee',
    'Storage Fee', 'Subscription Fee', 'To be Categotized', 'Shipping', 'Gift Wrap', 'Tax', 'Gift Wrap Tax', 'Shipping Tax'
    ]
order_PnL_Section_V = ['Advertising Fee for Sales', 'Advertising Fee for Non-Sales']

order_PnL_Section_IV_Sales_Principal = ['Total'] + [np.nan] + [
    'PC Sales Principal', 'Components Sales Principal', 'Refunded Commission', 'Refunded Shipping Chargeback',
    'Refunded Product Promotion', 'Refunded Shipping Promotion', 'Refunded Marketplace Facilitator Tax - Principal',
    'Refunded Marketplace Facilitator Tax - Shipping', 'Commission', 'FBA Fulfillment Fee', 'Sales Tax Service Fee', 'FBM Shipping Commission', 'Digital Services Fee',
    'Shipping Chargeback', 'Sponsored Products Charge', 'Product Sales Promotion', 'Shipping Promotion',
    'MarketplaceFacilitatorTax-Principal', 'MarketplaceFacilitatorTax-Shipping', 'FBA Inbound Transportation Fee',
    'Storage Fee', 'Subscription Fee', 'To be Categotized', 'Shipping', 'Gift Wrap', 'Tax', 'Gift Wrap Tax', 'Shipping Tax'
    ]
order_PnL_Section_V_Sponsored_Products_Charge = [np.nan] + ['Advertising Fee for Sales', 'Advertising Fee for Non-Sales']