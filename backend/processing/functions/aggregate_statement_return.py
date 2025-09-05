import pandas as pd

def sum_statement_items_Return(df, PnL_month):

    df = df[
        (df['transaction-type'] == 'Refund') |
        (df['transaction-type'] == 'Chargeback Refund') |
        (df['transaction-type'] == 'A-to-z Guarantee Refund')
        ]

    exclude_columns = [
        'marketplace-name', 
        'settlement-id', 'settlement-start-date-PST-PDT', 'settlement-end-date-PST-PDT', 
        'deposit-date-UTC','deposit-date-PST-PDT',
        'posted-date-time', 'posted-date-UTC','posted-date-PST-PDT', 
        'transaction-type',
        'order-id', 'sku',
        'all order PnL Date', 'quantity-purchased'
        ]

    PnL_month_str = PnL_month.strftime('%Y-%m-%d')
    order_condition = (df['all order PnL Date'] == PnL_month_str)

    always_sum_columns = {
        'Refunded Commission': 'ItemFees: Commission',
        'Refunded FBM Shipping Commission': 'ItemFees: ShippingHB',
        'Refunded Digital Services Fee': 'ItemFees: DigitalServicesFee',
        'Refunded Product Promotion': 'Promotion: Principal',
        'Refunded Shipping Promotion': 'Promotion: Shipping',
        'Refunded Shipping Chargeback': 'ItemFees: ShippingChargeback',
        'Refunded Marketplace Facilitator Tax - Principal': 'ItemWithheldTax: MarketplaceFacilitatorTax-Principal',
        'Refunded Marketplace Facilitator Tax - Shipping': 'ItemWithheldTax: MarketplaceFacilitatorTax-Shipping',
        'Return Product Revenue Reversal - Shipping': 'ItemPrice: Shipping',
        'Return Product Revenue Reversal - Gift Wrap': 'ItemPrice: GiftWrap',
        'Return Product Revenue Reversal - Tax': 'ItemPrice: Tax',
        'Return Product Revenue Reversal - Shipping Tax':  'ItemPrice: ShippingTax',
        'Return Product Revenue Reversal - Gift Wrap Tax': 'ItemPrice: GiftWrapTax'
        }
    
    result = pd.DataFrame({
        col_name: [df.loc[order_condition, col].sum()] if col in df.columns else [0]
        for col_name, col in always_sum_columns.items()
    })

    always_sum_columns_names = list(always_sum_columns.values())

    # Handle items that will not appear all the time
    remaining_columns = df.columns.difference(exclude_columns + always_sum_columns_names, sort=False)
    for col in remaining_columns:
        col_sum = df.loc[order_condition, col].sum()
        if col_sum != 0:
            result[col] = col_sum
    if 'ItemPrice: Principal' in result.columns:
        result = result.drop(columns=['ItemPrice: Principal'])

    result = result.T
    result.columns = ['Statement Values']
    result = result.reset_index()
    result = result.rename(columns={'index': 'Statement PnL Items'})
    
    return result