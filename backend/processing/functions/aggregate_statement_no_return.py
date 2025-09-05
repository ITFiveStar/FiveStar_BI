
import pandas as pd

def sum_statement_items_nonReturn(df, PnL_month, first_day_PnL_month):

    df = df[
        (df['transaction-type'] != 'Refund') &
        (df['transaction-type'] != 'Chargeback Refund') &
        (df['transaction-type'] != 'A-to-z Guarantee Refund')
        ]

    exclude_columns = [
        'marketplace-name', 
        'settlement-id', 'settlement-start-date-PST-PDT', 'settlement-end-date-PST-PDT', 
        'deposit-date-UTC','deposit-date-PST-PDT',
        'posted-date-time', 'posted-date-UTC','posted-date-PST-PDT', 
        'transaction-type',
        'order-id', 'sku',
        'all order PnL Date', 'sku', 'quantity-purchased'
        ]

    # Condition for summing different values (order-related and non-order-related)
    PnL_month_str = PnL_month.strftime('%Y-%m-%d')
    order_condition = (df['transaction-type'] == 'Order') & (df['all order PnL Date'] == PnL_month_str)
    nonorder_condition = (
        (df['posted-date-PST-PDT'] <= PnL_month) & 
        (df['posted-date-PST-PDT'] >= first_day_PnL_month)
        )

    # Items that will appear all the time
    result = pd.DataFrame({
        'Sales Principal': [df.loc[order_condition, 'ItemPrice: Principal'].sum()],
        'Shipping': [df.loc[order_condition, 'ItemPrice: Shipping'].sum()],
        'Gift Wrap': [df.loc[order_condition, 'ItemPrice: GiftWrap'].sum()],
        
        'Sales Tax': [df.loc[order_condition, 'ItemPrice: Tax'].sum()],
        'Shipping Tax': [df.loc[order_condition, 'ItemPrice: ShippingTax'].sum()],
        'Gift Wrap Tax': [df.loc[order_condition, 'ItemPrice: GiftWrapTax'].sum()],
        
        'Commission': [df.loc[order_condition, 'ItemFees: Commission'].sum()],
        'FBA Fulfillment Fee': [df.loc[order_condition, 'ItemFees: FBAPerUnitFulfillmentFee'].sum()],
        'Sales Tax Service Fee': [df.loc[order_condition, 'ItemFees: SalesTaxServiceFee'].sum()],

        'Marketplace Facilitator Tax Principal': [df.loc[order_condition, 'ItemWithheldTax: MarketplaceFacilitatorTax-Principal'].sum()],
        'Marketplace Facilitator Tax Shipping': [df.loc[order_condition, 'ItemWithheldTax: MarketplaceFacilitatorTax-Shipping'].sum()],

        'FBM Shipping Commission': [df.loc[order_condition, 'ItemFees: ShippingHB'].sum()],
        'Digital Services Fee': [df.loc[order_condition, 'ItemFees: DigitalServicesFee'].sum()],
        
        'Sponsored Products Charge': [df.loc[nonorder_condition, 'Cost of Advertising: TransactionTotalAmount'].sum()],
        'Product Sales Promotion': [df.loc[order_condition, 'Promotion: Principal'].sum()],
        'Shipping Promotion': [df.loc[order_condition, 'Promotion: Shipping'].sum()],
        
        'FBA Inbound Transportation Fee': [df.loc[nonorder_condition, 'other-transaction: FBAInboundTransportationFee'].sum()],
        'Subscription Fee': [df.loc[nonorder_condition, 'other-transaction: Subscription Fee'].sum()],
        'Storage Fee': [df.loc[nonorder_condition, 'other-transaction: Storage Fee'].sum()],
        })

    always_sum_columns = {
        'Sales Principal': 'ItemPrice: Principal',
        'Shipping': 'ItemPrice: Shipping',
        'Gift Wrap': 'ItemPrice: GiftWrap',
        'Sales Tax': 'ItemPrice: Tax',
        'Shipping Tax': 'ItemPrice: ShippingTax',
        'Gift Wrap Tax': 'ItemPrice: GiftWrapTax',
        'Commission': 'ItemFees: Commission',
        'FBA Fulfillment Fee': 'ItemFees: FBAPerUnitFulfillmentFee',
        'Sales Tax Service Fee': 'ItemFees: SalesTaxServiceFee',
        'Marketplace Facilitator Tax Principal': 'ItemWithheldTax: MarketplaceFacilitatorTax-Principal',
        'Marketplace Facilitator Tax Shipping': 'ItemWithheldTax: MarketplaceFacilitatorTax-Shipping',
        'FBM Shipping Commission': 'ItemFees: ShippingHB',
        'Digital Services Fee': 'ItemFees: DigitalServicesFee',
        'Sponsored Products Charge': 'Cost of Advertising: TransactionTotalAmount',
        'Product Sales Promotion': 'Promotion: Principal',
        'Shipping Promotion': 'Promotion: Shipping',
        'FBA Inbound Transportation Fee': 'other-transaction: FBAInboundTransportationFee',
        'Subscription Fee': 'other-transaction: Subscription Fee',
        'Storage Fee': 'other-transaction: Storage Fee'
        }
    always_sum_columns_names = list(always_sum_columns.values())

    # Handle items that will not appear all the time
    remaining_columns = df.columns.difference(exclude_columns + always_sum_columns_names, sort=False)
    for col in remaining_columns:
        if col in [
            'ItemFees: ShippingChargeback'
            ]:
            col_sum = df.loc[order_condition, col].sum()
            if col_sum != 0:
                result[col] = col_sum
        else:
            col_sum = df.loc[nonorder_condition, col].sum()
            if col_sum != 0:
                result[col] = col_sum

    result = result.T
    result.columns = ['Statement Values']
    result = result.reset_index()
    result = result.rename(columns={'index': 'Statement PnL Items'})

    return result