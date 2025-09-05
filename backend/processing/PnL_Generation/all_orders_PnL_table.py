import os
import sys
import pandas as pd
import numpy as np
import datetime

# Import configuration
current_directory = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_directory, os.pardir, os.pardir, os.pardir))
sys.path.append(project_root)

# Import Flask app and database connection
from backend import db
from backend.processing.functions.date_processing import add_month_end_column
from backend.processing.functions.config_for_amazon_BI import (
    commission_rate, sales_tax_service_fee_rate, marketplace_facilitator_tax_principal_rate, marketplace_facilitator_tax_shipping_rate, 
    FBM_shipping_commission_rate, digital_services_fee_rate, subscription_fee,
    hardware_names_pattern,
    keep_columns_statement_summary, keep_columns_statement_details,
    keep_columns_all_orders_joined_with_sku_economics,
    ordered_columns_all_orders_PnL, rename_dict_all_orders_PnL, columns_to_negate_all_orders_PnL,
    statement_order_rename_dict, statement_return_rename_dict,
    statement_details_non_order_related_remove,
    statement_details_non_order_related_rename_dict_interim, statement_details_non_order_related_rename_dict,
    final_all_orders_PnL, 
    statement_details_non_sku_related_items
)

# Use the existing Flask-SQLAlchemy database connection
engine = db.engine

query = """
    SELECT *
    FROM amazonallorders
"""
all_orders = pd.read_sql_query(query, engine)

query = """
    SELECT *
    FROM skueconomics
"""
sku_economics = pd.read_sql_query(query, engine)
if sku_economics is None or sku_economics.empty:
    sku_economics = pd.DataFrame(columns=[
        'id',
        'amazon_store',
        'start_date_pst_pdt',
        'end_date_pst_pdt',
        'MSKU',
        'currency_code',
        'FBA_fulfillment_fees_total',
        'sponsored_products_charge_total',
        'monthly_inventory_storage_fee_total',
        'inbound_transportation_charge_total'
        ])
sku_economics = sku_economics.rename(columns={'msku': 'MSKU','fba_fulfillment_fees_total':'FBA_fulfillment_fees_total'})

query = """
    SELECT date_by_day, sku, sum(spend) as spend
    FROM adsspendbyday
    GROUP BY date_by_day, sku
"""
ads_spend_by_day = pd.read_sql_query(query, engine)

query = """
    SELECT *
    FROM amazoninboundshipping
"""
inbound_shipping = pd.read_sql_query(query, engine)
if inbound_shipping is None or inbound_shipping.empty:
    inbound_shipping = pd.DataFrame(columns=[
        'id',
        'shipment_name',
        'shipment_id',
        'created_pst_pdt',
        'last_updated_pst_pdt',
        'ship_to',
        'units_expected',
        'units_located',
        'status',
        'amazon_partnered_carrier_cost',
        'currency',
        'MSKU'
        ])
inbound_shipping = inbound_shipping.rename(columns={'msku': 'MSKU'})

query = """
    SELECT *
    FROM amazonstatements
"""
statements = pd.read_sql_query(query, engine)

query = """
    SELECT *
    FROM adscreditcardpayment
"""
ads_credit_card_payment = pd.read_sql_query(query, engine)

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
# Data Preparation                                                                                                                                                                                               |
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# all_orders processing: successful orders only
all_orders = all_orders[
    (all_orders['item_status'] != 'Cancelled') &
    (all_orders['quantity'] != 0)
    ]

# all_orders processing: dates
all_orders['purchase_date_pst_pdt'] = pd.to_datetime(all_orders['purchase_date_pst_pdt'], errors='coerce')
all_orders['Data Month Last Day'] = add_month_end_column(all_orders['purchase_date_pst_pdt'])
all_orders['Data Month First Day'] = all_orders['Data Month Last Day'].apply(lambda x: x.replace(day=1))
all_orders['purchase_date'] = all_orders['purchase_date_pst_pdt'].dt.date

# separate all_orders into Amazon and Non-Amazon
all_orders_nonAmazon = all_orders[
    (all_orders['sales_channel'] == 'Non-Amazon')
    ]
all_orders = all_orders[
    (all_orders['sales_channel'] == 'Amazon.com')
    ]
all_orders_NonAmazon_statement_order_date = all_orders_nonAmazon[['amazon_order_id','purchase_date_pst_pdt', 'Data Month First Day', 'Data Month Last Day','sku']].drop_duplicates()

# all_orders processing: map monthly SKU sales quantity to SKU in each order in all_orders
all_orders = all_orders.groupby([
    'Data Month First Day',
    'Data Month Last Day',
    'amazon_order_id',
    'purchase_date_pst_pdt',
    'purchase_date',
    'fulfillment_channel',
    'sales_channel',
    'sku',
    'item_status',
    'currency',
    ])[['quantity','item_price','item_tax','shipping_price','shipping_tax','gift_wrap_price','gift_wrap_tax','item_promotion_discount','ship_promotion_discount']].sum().reset_index()

sku_quantity_sum = all_orders.groupby(['Data Month Last Day', 'sku'])['quantity'].sum()
all_orders['total_quantity_per_sku_per_month'] = all_orders.set_index(['Data Month Last Day', 'sku']).index.map(sku_quantity_sum)

month_quantity_sum = all_orders.groupby(['Data Month Last Day'])['quantity'].sum()
all_orders['total_quantity_per_month'] = all_orders.set_index(['Data Month Last Day']).index.map(month_quantity_sum)

sku_quantity_sum_by_day = all_orders.groupby(['purchase_date', 'sku'])['quantity'].sum()
all_orders['total_quantity_per_sku_per_day'] = all_orders.set_index(['purchase_date', 'sku']).index.map(sku_quantity_sum_by_day)

fba_orders = all_orders[all_orders['fulfillment_channel'] == 'Amazon']
fba_month_quantity_sum = fba_orders.groupby('Data Month Last Day')['quantity'].sum()
all_orders['total_quantity_per_month_FBA_only'] = all_orders['Data Month Last Day'].map(fba_month_quantity_sum)

# sku_economics processing: dates
sku_economics['start_date_pst_pdt'] = pd.to_datetime(sku_economics['start_date_pst_pdt'], errors='coerce').dt.date
sku_economics['end_date_pst_pdt'] = pd.to_datetime(sku_economics['end_date_pst_pdt'], errors='coerce').dt.date
sku_economics['Data Month Last Day'] = add_month_end_column(sku_economics['end_date_pst_pdt'])
sku_economics['Data Month First Day'] = sku_economics['Data Month Last Day'].apply(lambda x: x.replace(day=1))

# ads_spend_by_day processing: dates
ads_spend_by_day['date_by_day'] = pd.to_datetime(ads_spend_by_day['date_by_day'], errors='coerce').dt.date
ads_spend_by_day['Data Month Last Day'] = add_month_end_column(ads_spend_by_day['date_by_day'])

# sku_economics processing: numeric columns & keep only rows with sum of numeric columns != 0
sku_economics[['FBA_fulfillment_fees_total', 'sponsored_products_charge_total', 'monthly_inventory_storage_fee_total', 'inbound_transportation_charge_total']].apply(pd.to_numeric, errors='coerce').round(2)
numeric_cols = sku_economics.select_dtypes(include='number').columns
sku_economics = sku_economics[
    (sku_economics[numeric_cols].sum(axis=1) != 0)
    ]

# inbound_shipping processing: dates
inbound_shipping['created_pst_pdt'] = pd.to_datetime(inbound_shipping['created_pst_pdt'], errors='coerce').dt.date
inbound_shipping['Data Month Last Day'] = add_month_end_column(inbound_shipping['created_pst_pdt'])

# statements processing: dates
statements['deposit_date_pst_pdt'] = pd.to_datetime(statements['deposit_date_pst_pdt'], errors='coerce').dt.date
statements['posted_date_time_pst_pdt'] = pd.to_datetime(statements['posted_date_time_pst_pdt'], errors='coerce').dt.date

# statements processing: settlement_id to string
statements['settlement_id'] = statements['settlement_id'].astype(int).apply(lambda x: f'{x:.0f}')

# statements processing: summary of all statements - contain Statement ID, Deposit Date, and Total Amount for later look-up
statement_summary = statements[
    (statements['transaction_type'].isna()) | (statements['transaction_type'] == '')
    ]
statement_summary = statement_summary[keep_columns_statement_summary]

# statements processing: statement details table - non summary row with settlement start & end date and deposit-date
statement_details = statements[
    (statements['transaction_type'].notna()) & (statements['transaction_type'] != '')
    ]
statement_details = statement_details[keep_columns_statement_details]
statement_details['quantity_purchased'] = statement_details['quantity_purchased'].fillna(0).astype(int)
statement_details['quantity_purchased'] = statement_details['quantity_purchased'].apply(lambda x: f'{x:.0f}')
statement_details['amount_type_description'] = statement_details['amount_type'] + ': ' + statement_details['amount_description']

statement_details = pd.merge(
    statement_details, 
    statement_summary, 
    left_on=['settlement_id'], 
    right_on=['settlement_id'],
    how='left'
    )

# NonAmazon_amount (MCF Fees)
statement_details_nonAmazon = statement_details[
    statement_details['marketplace_name'] == 'Non-Amazon'
    ]
statement_details_nonAmazon = pd.merge(
    statement_details_nonAmazon, 
    all_orders_NonAmazon_statement_order_date, 
    left_on=['order_id'], 
    right_on=['amazon_order_id'],
    how='left'
    )
statement_details_nonAmazon = statement_details_nonAmazon[
    statement_details_nonAmazon['amazon_order_id'].notna() & (statement_details_nonAmazon['amazon_order_id'] != '')
    ]

# statement_details (Amazon CA)
statement_details = statement_details[
    statement_details['marketplace_name'] != 'Non-Amazon'
    ]

# ads_credit_card_payment processing
ads_credit_card_payment['issued_on'] = pd.to_datetime(ads_credit_card_payment['issued_on'], errors='coerce')
ads_credit_card_payment['due_date'] = pd.to_datetime(ads_credit_card_payment['due_date'], errors='coerce')
ads_credit_card_payment = ads_credit_card_payment.groupby(['invoice_id','issued_on','due_date'])['total_amount_billed'].sum().reset_index()

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
# All Orders P&L                                                                                                                                                                                                    |
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# join all_orders with sku_economics to calculate expected expenses (FBA Fulfillment Fee, Sponsored Products Charge, Storage Fee, Subscription Fee)

sku_economics_without_inbound = sku_economics[['Data Month First Day', 'Data Month Last Day', 'MSKU', 'FBA_fulfillment_fees_total', 'sponsored_products_charge_total', 'monthly_inventory_storage_fee_total']]
numeric_cols = sku_economics_without_inbound.select_dtypes(include='number').columns
sku_economics_without_inbound = sku_economics_without_inbound[
    (sku_economics_without_inbound[numeric_cols].sum(axis=1) != 0)
    ]
all_orders_PnL = pd.merge(
    all_orders, 
    sku_economics_without_inbound, 
    left_on=['Data Month First Day', 'Data Month Last Day', 'sku'], 
    right_on=['Data Month First Day', 'Data Month Last Day', 'MSKU'],
    how='outer'
    )

all_orders_PnL['sales_status'] = all_orders_PnL['quantity'].apply(lambda x: 'Non-Sales' if pd.isna(x) or x == 0 else 'Sales')
all_orders_PnL['sku'] = all_orders_PnL.apply(lambda row: row['MSKU'] if row['sales_status'] == 'Non-Sales' and pd.isna(row['sku']) else row['sku'], axis=1)
all_orders_PnL = all_orders_PnL[keep_columns_all_orders_joined_with_sku_economics]

all_orders_PnL['Commission'] = all_orders_PnL['item_price'] * commission_rate
all_orders_PnL['FBA Fulfillment Fee'] = all_orders_PnL.apply(
    lambda row: row['FBA_fulfillment_fees_total']
    if row['sales_status'] == 'Non-Sales' or pd.isna(row['total_quantity_per_sku_per_month']) or row['total_quantity_per_sku_per_month'] == 0
    else (row['FBA_fulfillment_fees_total'] or 0) / row['total_quantity_per_sku_per_month'] * row['quantity'],
    axis=1
    )

all_orders_PnL['Sales Tax Service Fee'] = all_orders_PnL['item_tax'] * sales_tax_service_fee_rate
all_orders_PnL['marketplace_facilitator_tax_principal'] = all_orders_PnL['item_tax'] * marketplace_facilitator_tax_principal_rate
all_orders_PnL['marketplace_facilitator_tax_shipping'] = all_orders_PnL['shipping_tax'] * marketplace_facilitator_tax_shipping_rate
all_orders_PnL['FBM Shipping Commission'] = all_orders_PnL['quantity'] * FBM_shipping_commission_rate
all_orders_PnL['FBM Shipping Commission'] = all_orders_PnL.apply(lambda row: np.nan if row['fulfillment_channel'] == 'Amazon' else row['FBM Shipping Commission'], axis=1)
all_orders_PnL['Digital Services Fee'] = all_orders_PnL.apply(
    lambda row: np.nan if row['Data Month First Day'] < datetime.date(2024, 10, 1) 
    else row['item_price'] * digital_services_fee_rate, 
    axis=1
    )

all_orders_PnL['Sponsored Products Charge'] = all_orders_PnL.apply(
    lambda row: row['sponsored_products_charge_total'] if row['sales_status'] == 'Non-Sales' 
    else (row['sponsored_products_charge_total'] / row['total_quantity_per_sku_per_month']) * row['quantity'],
    axis=1
    )
all_orders_PnL['Storage Fee'] = all_orders_PnL.apply(
    lambda row: row['monthly_inventory_storage_fee_total']
    if row['sales_status'] == 'Non-Sales'
    or pd.isna(row['total_quantity_per_sku_per_month'])
    or row['total_quantity_per_sku_per_month'] == 0
    else (row['monthly_inventory_storage_fee_total'] or 0) / row['total_quantity_per_sku_per_month'] * row['quantity'],
    axis=1
    )
all_orders_PnL['Subscription Fee'] = all_orders_PnL.apply(
    lambda row: 0 if row['sales_status'] == 'Non-Sales' 
    else (subscription_fee / row['total_quantity_per_month']) * row['quantity'],
    axis=1
    )

# join all_orders with ads_spend_by_day to calculate ad spends by day (no longer use SKU economics ads spend, starting from 6/1/2025)
ads_spend_by_day = ads_spend_by_day.rename(columns={'sku': 'MSKU'})
all_orders_PnL = pd.merge(
    all_orders_PnL, 
    ads_spend_by_day, 
    left_on=['purchase_date', 'sku'], 
    right_on=['date_by_day', 'MSKU'],
    how='outer'
    )
all_orders_PnL['Data Month Last Day'] = all_orders_PnL.apply( lambda row: row['Data Month Last Day_y'] if pd.isna(row['Data Month Last Day_x']) else row['Data Month Last Day_x'], axis=1)
all_orders_PnL['Data Month First Day'] = all_orders_PnL['Data Month Last Day'].apply(lambda x: x.replace(day=1))
all_orders_PnL['sku'] = all_orders_PnL.apply( lambda row: row['MSKU'] if pd.isna(row['sku']) else row['sku'], axis=1)
all_orders_PnL['purchase_date_pst_pdt'] = all_orders_PnL.apply( lambda row: pd.to_datetime(row['date_by_day']) if pd.isna(row['purchase_date_pst_pdt']) and pd.to_datetime(row['Data Month Last Day']).date() > pd.to_datetime('2025-06-01').date() else row['purchase_date_pst_pdt'], axis=1)
all_orders_PnL['purchase_date'] = all_orders_PnL.apply( lambda row: row['date_by_day'] if pd.isna(row['purchase_date']) and pd.to_datetime(row['Data Month Last Day']).date() > pd.to_datetime('2025-06-01').date() else row['purchase_date'], axis=1)

all_orders_PnL['sales_status'] = all_orders_PnL['quantity'].apply(lambda x: 'Non-Sales' if pd.isna(x) or x == 0 else 'Sales') 
all_orders_PnL['Sponsored Products Charge'] = all_orders_PnL.apply(
    lambda row: (
        # If date_by_day is NaN or before 6/1/2025, keep original value
        row['Sponsored Products Charge'] if pd.to_datetime(row['Data Month Last Day']).date() < pd.to_datetime('2025-06-01').date()
        # For dates >= 6/1/2025: apply new logic
        else row['spend'] if row['sales_status'] == 'Non-Sales'
        else (row['spend'] / row['total_quantity_per_sku_per_day']) * row['quantity']
    ),
    axis=1
    )
all_orders_PnL = all_orders_PnL.drop(columns=['Data Month Last Day_x', 'Data Month Last Day_y','MSKU'])

# join all_orders with sku_economics and inbound_shipping to calculate expected expenses (FBA Inbound Transportation Fee)
inbound_shipping = inbound_shipping.groupby(['Data Month Last Day', 'MSKU'])['units_expected'].sum().reset_index()
inbound_shipping = inbound_shipping[
    (inbound_shipping['MSKU'].notna()) & (inbound_shipping['MSKU'].str.strip() != '')
    ]
inbound_shipping['MSKU'] = inbound_shipping['MSKU'].str.strip()

# Make sure all shipped skus have a row for each monthend for cumulative_units_expected and join with all_orders_PnL
all_months = sorted(all_orders_PnL['Data Month Last Day'].unique())
first_appearance = inbound_shipping.groupby('MSKU')['Data Month Last Day'].min()
new_rows = []
for msku, first_date in first_appearance.items():
    for month in all_months:
        if month > first_date and not ((inbound_shipping['MSKU'] == msku) & (inbound_shipping['Data Month Last Day'] == month)).any():
            new_rows.append({'Data Month Last Day': month, 'MSKU': msku, 'units_expected': 0})
inbound_shipping = pd.concat([inbound_shipping, pd.DataFrame(new_rows)], ignore_index=True)

# Calculate cumulative units expected
if not inbound_shipping.empty:
    inbound_shipping["cumulative_units_expected"] = inbound_shipping.sort_values(["MSKU", "Data Month Last Day"]) \
                      .groupby("MSKU")["units_expected"] \
                      .cumsum()
    all_orders_PnL = pd.merge(
        all_orders_PnL, 
        inbound_shipping, 
        left_on=['sku', 'Data Month Last Day'], 
        right_on=['MSKU', 'Data Month Last Day'],
        how='left'
        )
    all_orders_PnL = all_orders_PnL.drop(columns=['MSKU','units_expected'])

    sku_economics_inbound = sku_economics[['Data Month Last Day', 'MSKU', 'inbound_transportation_charge_total']]
    sku_economics_inbound = pd.merge(
        inbound_shipping, 
        sku_economics_inbound, 
        left_on=['MSKU', 'Data Month Last Day'], 
        right_on=['MSKU', 'Data Month Last Day'],
        how='left'
        )
    sku_economics_inbound['inbound_transportation_charge_total'] = sku_economics_inbound['inbound_transportation_charge_total'].fillna(0)
    sku_economics_inbound['cumulative_inbound_transportation_charge_total'] = sku_economics_inbound.sort_values(["MSKU", "Data Month Last Day"]) \
                        .groupby("MSKU")["inbound_transportation_charge_total"] \
                        .cumsum()
    sku_economics_inbound = sku_economics_inbound[['Data Month Last Day', 'MSKU', 'cumulative_inbound_transportation_charge_total']]

    all_orders_PnL = pd.merge(
        all_orders_PnL, 
        sku_economics_inbound, 
        left_on=['sku', 'Data Month Last Day'], 
        right_on=['MSKU', 'Data Month Last Day'],
        how='left'
        )
    all_orders_PnL = all_orders_PnL.drop(columns=['MSKU'])

    all_orders_PnL['FBA Inbound Transportation Fee'] = all_orders_PnL.apply(
        lambda row: 0 if row['sales_status'] == 'Non-Sales' 
        else (row['cumulative_inbound_transportation_charge_total'] / row['cumulative_units_expected']) * row['quantity'],
        axis=1
        )
else:
    all_orders_PnL['FBA Inbound Transportation Fee'] = 0

# finalize all_orders_PnL
all_orders_PnL['Product Type'] = np.where(
    all_orders_PnL['sku'].str.contains(hardware_names_pattern, case=False, na=False), 
    'Hardware', 
    'PC'
    )
all_orders_PnL = all_orders_PnL[ordered_columns_all_orders_PnL]
all_orders_PnL = all_orders_PnL.rename(columns=rename_dict_all_orders_PnL)
all_orders_PnL[columns_to_negate_all_orders_PnL] = all_orders_PnL[columns_to_negate_all_orders_PnL] * -1

sales_status_order = pd.Categorical(
    all_orders_PnL['sales_status'], 
    categories=['Sales', 'Non-Sales'], 
    ordered=True
    )
all_orders_PnL['sales_status'] = sales_status_order
product_type_order = pd.Categorical(
    all_orders_PnL['product_type'], 
    categories=['PC', 'Hardware'], 
    ordered=True
    )
all_orders_PnL['product_type'] = product_type_order
all_orders_PnL = all_orders_PnL.sort_values(by=['sales_status', 'product_type', 'purchase_date_pst_pdt'], ascending=[True, True, False])

numeric_cols = all_orders_PnL.select_dtypes(include='number').columns
all_orders_PnL = all_orders_PnL[
    (all_orders_PnL[numeric_cols].sum(axis=1) != 0)
    ]

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
# Statement Processing                                                                                                                                                                                           |
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# ---------------------------------------------------
# With Order ID Statements                          |
# ---------------------------------------------------
# Statements order realted
statement_details_w_order_id = statement_details[statement_details['order_id'].str.contains(r'^[0-9-]+$', na=False)]

# pivot order and refund related statement details table - reorganize to have each amount_type_description seperately as columns (mimic all_orders data structure)
statement_details_w_order_id.fillna('Missing', inplace=True) # to ensure pivot, only category columns in statement_details will have blank value (e.g. non-order related amount rows)
statement_details_w_order_id = statement_details_w_order_id[[
    'settlement_id', 'deposit_date_pst_pdt', 'posted_date_time_pst_pdt', 
    'order_id', 'sku', 
    'transaction_type', 'amount_type_description',
    'amount'
    ]]
statement_details_w_order_id = statement_details_w_order_id.groupby(
        ['order_id', 'sku', 'transaction_type', 'amount_type_description', 'settlement_id', 'deposit_date_pst_pdt', 'posted_date_time_pst_pdt'], as_index=False
    ).agg({
        'amount': 'sum'
    })

order_statement_details_w_order_id = statement_details_w_order_id[
    (statement_details_w_order_id['transaction_type'] == 'Order') | (statement_details_w_order_id['transaction_type'] == 'other-transaction')
    ]
return_statement_details_w_order_id = statement_details_w_order_id[statement_details_w_order_id['transaction_type'].str.contains('Refund')]
order_statement_details_w_order_id = order_statement_details_w_order_id.drop(columns=['transaction_type'])
return_statement_details_w_order_id = return_statement_details_w_order_id.drop(columns=['transaction_type'])

order_statement_details_w_order_id = pd.pivot_table(
    order_statement_details_w_order_id,
    values='amount',
    index=['settlement_id', 'deposit_date_pst_pdt', 'posted_date_time_pst_pdt', 'order_id', 'sku'],
    columns='amount_type_description',
    aggfunc='sum',
    fill_value=0
    ).reset_index()

return_statement_details_w_order_id = pd.pivot_table(
    return_statement_details_w_order_id,
    values='amount',
    index=['settlement_id', 'deposit_date_pst_pdt', 'posted_date_time_pst_pdt', 'order_id', 'sku'],
    columns='amount_type_description',
    aggfunc='sum',
    fill_value=0
    ).reset_index()

order_statement_details_w_order_id.columns.name = None
order_statement_details_w_order_id.replace('Missing', np.nan, inplace=True)
order_statement_details_w_order_id = order_statement_details_w_order_id.rename(columns=statement_order_rename_dict)
columns_to_sum = [
    col for col in order_statement_details_w_order_id.columns 
    if col not in statement_order_rename_dict.values()
    ]

order_statement_details_w_order_id['statements_order_other'] = order_statement_details_w_order_id[columns_to_sum].sum(axis=1)
order_statement_details_w_order_id = order_statement_details_w_order_id.drop(columns=columns_to_sum)

return_statement_details_w_order_id.columns.name = None
return_statement_details_w_order_id.replace('Missing', np.nan, inplace=True)
return_statement_details_w_order_id = return_statement_details_w_order_id.rename(columns=statement_return_rename_dict)
columns_to_sum = [
    col for col in return_statement_details_w_order_id.columns 
    if col not in statement_return_rename_dict.values()
    ]
return_statement_details_w_order_id['statements_return_other'] = return_statement_details_w_order_id[columns_to_sum].sum(axis=1)
return_statement_details_w_order_id = return_statement_details_w_order_id.drop(columns=columns_to_sum)

order_return_statement_details_w_order_id = pd.merge(
    order_statement_details_w_order_id, 
    return_statement_details_w_order_id, 
    left_on=['amazon_order_id','sku'], 
    right_on=['amazon_order_id','sku'],
    how='outer'
    )

order_return_statement_details_w_order_id['order_statement_repeat_times'] = order_return_statement_details_w_order_id.groupby(['order_settlement_id','order_posted_date_time_pst_pdt','amazon_order_id','sku']).cumcount() + 1
order_statement_columns_to_replace = [
    'statements_item_price',
    'statements_shipping_price',
    'statements_shipping_chargeback',
    'statements_gift_wrap_price',
    'statements_gift_wrap_chargeback',
    'statements_item_tax',
    'statements_shipping_tax',
    'statements_gift_wrap_tax',
    'statements_item_promotion_discount',
    'statements_ship_promotion_discount',
    'statements_commission',
    'statements_sales_tax_service_fee',
    'statements_digital_services_fee',
    'statements_FBA_fulfillment_fee',
    'statements_FBM_shipping_commission',
    'statements_marketplace_facilitator_tax_principal',	
    'statements_marketplace_facilitator_tax_shipping',
    'statements_order_other'
    ]
mask = (order_return_statement_details_w_order_id['order_statement_repeat_times'] == 1) | (order_return_statement_details_w_order_id['order_statement_repeat_times'].isna())
for col in order_statement_columns_to_replace:
    order_return_statement_details_w_order_id.loc[~mask, col] = 0
order_return_statement_details_w_order_id = order_return_statement_details_w_order_id.drop(columns=['order_statement_repeat_times'])

order_return_statement_details_w_order_id['return_statement_repeat_times'] = order_return_statement_details_w_order_id.groupby(['return_settlement_id','return_posted_date_time_pst_pdt','amazon_order_id','sku']).cumcount() + 1
return_statement_columns_to_replace = [
    'returns_item_price',
    'returns_item_price_goodwill_adjustment',
    'returns_shipping_price',
    'returns_shipping_chargeback',
    'returns_gift_wrap_price',
    'returns_gift_wrap_chargeback',
    'returns_item_tax',
    'returns_shipping_tax',
    'returns_gift_wrap_tax',
    'returns_item_promotion_discount',
    'returns_ship_promotion_discount',
    'returns_commission',
    'returns_digital_services_fee',
    'returns_FBM_shipping_commission',
    'returns_marketplace_facilitator_tax_principal',
    'returns_marketplace_facilitator_tax_shipping',
    'returns_refund_commission',
    'statements_return_other'
    ]
mask = (order_return_statement_details_w_order_id['return_statement_repeat_times'] == 1) | (order_return_statement_details_w_order_id['return_statement_repeat_times'].isna())
for col in return_statement_columns_to_replace:
    order_return_statement_details_w_order_id.loc[~mask, col] = 0
order_return_statement_details_w_order_id = order_return_statement_details_w_order_id.drop(columns=['return_statement_repeat_times'])

order_return_statement_details_w_order_id_regular = order_return_statement_details_w_order_id[
    (order_return_statement_details_w_order_id['sku'].notna()) & (order_return_statement_details_w_order_id['sku'] != '')
    ]
order_return_statement_details_w_order_id_other_transaction = order_return_statement_details_w_order_id[
    (order_return_statement_details_w_order_id['sku'].isna()) | (order_return_statement_details_w_order_id['sku'] == '')
    ]

sku_price_info = all_orders_PnL[['amazon_order_id','sku','item_price']].rename(columns={'sku': 'MSKU','item_price': 'item_price_allocation_reference'})
order_return_statement_details_w_order_id_other_transaction = pd.merge(
    order_return_statement_details_w_order_id_other_transaction,
    sku_price_info,
    left_on=['amazon_order_id'],
    right_on=['amazon_order_id'],
    how='left'
    )
order_return_statement_details_w_order_id_other_transaction['sku'] = order_return_statement_details_w_order_id_other_transaction.apply(
    lambda row: row['MSKU'] if pd.isna(row['sku']) or row['sku'] == '' else row['sku'],
    axis=1
    )
order_id_price_sum = order_return_statement_details_w_order_id_other_transaction.groupby(['order_settlement_id','order_deposit_date_pst_pdt','order_posted_date_time_pst_pdt','amazon_order_id'])['item_price_allocation_reference'].sum()
order_return_statement_details_w_order_id_other_transaction['total_price_reference_per_order_statement'] = order_return_statement_details_w_order_id_other_transaction.set_index(['order_settlement_id','order_deposit_date_pst_pdt','order_posted_date_time_pst_pdt','amazon_order_id']).index.map(order_id_price_sum)
order_return_statement_details_w_order_id_other_transaction['statements_order_other'] = order_return_statement_details_w_order_id_other_transaction.apply(
    lambda row: row['statements_order_other']
    if pd.isna(row['total_price_reference_per_order_statement']) or row['total_price_reference_per_order_statement'] == 0
    else row['statements_order_other'] * (row['item_price_allocation_reference'] / row['total_price_reference_per_order_statement']),
    axis=1
    )
order_return_statement_details_w_order_id_other_transaction = order_return_statement_details_w_order_id_other_transaction.drop(columns=['MSKU','item_price_allocation_reference','total_price_reference_per_order_statement'])

order_return_statement_details_w_order_id = pd.concat([order_return_statement_details_w_order_id_regular, order_return_statement_details_w_order_id_other_transaction])
groupby_columns = [
    'order_settlement_id',
    'order_deposit_date_pst_pdt',
    'order_posted_date_time_pst_pdt',
    'amazon_order_id',
    'sku',
    'return_settlement_id',
    'return_deposit_date_pst_pdt',
    'return_posted_date_time_pst_pdt'
    ]
sum_columns = [
    col for col in order_return_statement_details_w_order_id.columns 
    if col not in groupby_columns
    ]
order_return_statement_details_w_order_id[groupby_columns] = order_return_statement_details_w_order_id[groupby_columns].fillna('missing')
order_return_statement_details_w_order_id[sum_columns] = order_return_statement_details_w_order_id[sum_columns].fillna(0)
order_return_statement_details_w_order_id = order_return_statement_details_w_order_id.groupby(groupby_columns).agg({
    **{col: 'sum' for col in sum_columns}
    }).reset_index()
order_return_statement_details_w_order_id[groupby_columns] = order_return_statement_details_w_order_id[groupby_columns].replace('missing', pd.NA)

all_orders_PnL = pd.merge(
    all_orders_PnL, 
    order_return_statement_details_w_order_id, 
    left_on=['amazon_order_id','sku'], 
    right_on=['amazon_order_id','sku'],
    how='left'
    )

# replace >1st occurrence rows with 0 for value when the left join can result in multiple rows per order_id + sku
all_orders_PnL['repeat_times'] = all_orders_PnL.groupby(['amazon_order_id','sku']).cumcount() + 1
columns_to_replace = [
    'quantity', 'item_price', 'shipping_price', 'gift_wrap_price',
    'item_tax', 'shipping_tax', 'gift_wrap_tax',
    'item_promotion_discount', 'ship_promotion_discount',
    'commission', 'sponsored_products_charge', 'sales_tax_service_fee',
    'marketplace_facilitator_tax_principal', 'marketplace_facilitator_tax_shipping',
    'digital_services_fee', 'FBA_fulfillment_fee', 'FBA_inbound_transportation_fee',
    'FBA_storage_fee', 'FBM_shipping_commission', 'subscription_fee', 'statements_order_other'
    ]
mask = (all_orders_PnL['repeat_times'] == 1) | (all_orders_PnL['repeat_times'].isna())
for col in columns_to_replace:
    all_orders_PnL.loc[~mask, col] = 0
all_orders_PnL = all_orders_PnL.drop(columns=['repeat_times'])

all_orders_PnL.insert(3, "payment_status",
    np.where(
        all_orders_PnL['order_settlement_id'].isna() | (all_orders_PnL['order_settlement_id'].fillna('').str.strip() == ''),
        'Unpaid',
        'Paid'
    )
    )
all_orders_PnL.insert(4, "return_status",
    np.where(
        all_orders_PnL['return_settlement_id'].isna() | (all_orders_PnL['return_settlement_id'].fillna('').str.strip() == ''),
        'N',  
        'Y'
    )
    )

# ---------------------------------------------------
# Without Order ID Statements                        |
# ---------------------------------------------------

statement_details_non_order_related = statement_details[
    statement_details['order_id'].isna() |  # Keep NaN values
    (statement_details['order_id'].fillna('').str.strip() == '') |  # Keep empty strings
    statement_details['order_id'].str.contains(r'[A-Za-z]', na=False)  # Keep rows where order_id contains letters
]

statement_details_non_order_related['Data Month Last Day'] = add_month_end_column(statement_details_non_order_related['posted_date_time_pst_pdt'])

pattern = r'CouponRedemptionFee|PromotionFee|LightningDealFee'
pattern2 = r'Coupon'
statement_details_non_order_related['amount_type_description'] = np.where(
    statement_details_non_order_related['amount_type_description'].str.contains(pattern, na=False) | statement_details_non_order_related['amount_type'].str.contains(pattern2, na=False),
    'Promotion/LightningDeal/CouponRedemption Fees',
    statement_details_non_order_related['amount_type_description']
    )
statement_details_non_order_related = statement_details_non_order_related.groupby([
    'Data Month Last Day', 
    'settlement_id', 
    'deposit_date_pst_pdt',
    'posted_date_time_pst_pdt',
    'amount_type_description'
    ])['amount'].sum().reset_index()
statement_details_non_order_related = statement_details_non_order_related[
    ~statement_details_non_order_related['amount_type_description'].isin(statement_details_non_order_related_remove)
    ]

statement_details_non_order_related = pd.pivot_table(
    statement_details_non_order_related,
    values='amount',
    index=['Data Month Last Day','settlement_id', 'deposit_date_pst_pdt', 'posted_date_time_pst_pdt'],
    columns='amount_type_description',
    aggfunc='sum',
    fill_value=0
    ).reset_index()

statement_details_non_order_related.columns.name = None
statement_details_non_order_related = statement_details_non_order_related.rename(columns=statement_details_non_order_related_rename_dict_interim)
columns_to_sum_FBA_storage_fee_statement = [col for col in statement_details_non_order_related.columns if col in statement_details_non_order_related_rename_dict_interim.values()]
statement_details_non_order_related["statements_FBA_storage_fee"] = statement_details_non_order_related[columns_to_sum_FBA_storage_fee_statement].sum(axis=1)
statement_details_non_order_related = statement_details_non_order_related.drop(columns=columns_to_sum_FBA_storage_fee_statement)

statement_details_non_order_related = statement_details_non_order_related.rename(columns=statement_details_non_order_related_rename_dict)

columns_to_sum = [
    col for col in statement_details_non_order_related.columns 
    if col not in statement_details_non_order_related_rename_dict.values()
    ]
statement_details_non_order_related["statements_other"] = statement_details_non_order_related[columns_to_sum].sum(axis=1)
statement_details_non_order_related = statement_details_non_order_related.drop(columns=columns_to_sum)

ads_credit_card_payment = ads_credit_card_payment.rename(columns={
    'invoice_id': 'non_order_settlement_id',
    'issued_on': 'non_order_posted_date_time_pst_pdt',
    'due_date': 'non_order_deposit_date_pst_pdt',
    'total_amount_billed': 'statements_sponsored_products_charge'
    })
ads_credit_card_payment['data_month_last_day'] = add_month_end_column(ads_credit_card_payment['non_order_posted_date_time_pst_pdt'])
ads_credit_card_payment['statements_sponsored_products_charge'] = ads_credit_card_payment['statements_sponsored_products_charge'] * -1
statement_details_non_order_related = pd.concat([statement_details_non_order_related, ads_credit_card_payment])

statement_details_non_order_related['data_month_first_day'] = statement_details_non_order_related['data_month_last_day'].apply(lambda x: x.replace(day=1))
statement_details_non_order_related['sales_status'] = 'Non-Sales'
statement_details_non_order_related['payment_status'] = 'Paid'
all_orders_PnL = pd.concat([all_orders_PnL, statement_details_non_order_related], ignore_index=True)

paid_month_advertising_sum = all_orders_PnL[all_orders_PnL['payment_status'] == 'Paid'].groupby('data_month_last_day')['sponsored_products_charge'].sum()
all_orders_PnL['total_paid_advertising_per_month'] = all_orders_PnL['data_month_last_day'].map(paid_month_advertising_sum)
all_orders_PnL['total_paid_advertising_per_month'] = all_orders_PnL['total_paid_advertising_per_month'].replace(0, np.nan)
statement_advertising_sum = all_orders_PnL.groupby(['data_month_last_day'])['statements_sponsored_products_charge'].sum()
all_orders_PnL['total_statements_sponsored_products_charge'] = all_orders_PnL['data_month_last_day'].map(statement_advertising_sum)
all_orders_PnL['total_statements_sponsored_products_charge'] = all_orders_PnL['total_statements_sponsored_products_charge'].replace(0, np.nan)
all_orders_PnL['statements_sponsored_products_charge_allocated'] = np.where(
    (all_orders_PnL['payment_status'] == 'Paid'),
    all_orders_PnL['sponsored_products_charge']/all_orders_PnL['total_paid_advertising_per_month']*all_orders_PnL['total_statements_sponsored_products_charge'],
    np.nan
    )

paid_month_storage_fee_sum = all_orders_PnL[all_orders_PnL['payment_status'] == 'Paid'].groupby(['data_month_last_day'])['FBA_storage_fee'].sum()
all_orders_PnL['total_paid_storage_fee_per_month'] = all_orders_PnL['data_month_last_day'].map(paid_month_storage_fee_sum)
all_orders_PnL['total_paid_storage_fee_per_month'] = all_orders_PnL['total_paid_storage_fee_per_month'].replace(0, np.nan)
statement_storage_fee_sum = all_orders_PnL.groupby(['data_month_last_day'])['statements_FBA_storage_fee'].sum()
all_orders_PnL['total_statements_FBA_storage_fee'] = all_orders_PnL['data_month_last_day'].map(statement_storage_fee_sum)
all_orders_PnL['total_statements_FBA_storage_fee'] = all_orders_PnL['total_statements_FBA_storage_fee'].replace(0, np.nan)
all_orders_PnL['statements_FBA_storage_fee_allocated'] = np.where(
    (all_orders_PnL['payment_status'] == 'Paid'),
    all_orders_PnL['FBA_storage_fee']/all_orders_PnL['total_paid_storage_fee_per_month']*all_orders_PnL['total_statements_FBA_storage_fee'],
    np.nan
    )


paid_month_promotion_sum = all_orders_PnL[all_orders_PnL['payment_status'] == 'Paid'].groupby(['data_month_last_day'])['item_promotion_discount'].sum()
all_orders_PnL['total_paid_promotion_per_month'] = all_orders_PnL['data_month_last_day'].map(paid_month_promotion_sum)
all_orders_PnL['total_paid_promotion_per_month'] = all_orders_PnL['total_paid_promotion_per_month'].replace(0, np.nan)
statement_promotion_sum = all_orders_PnL.groupby(['data_month_last_day'])['statements_promotion_deal_coupon_fees'].sum()
all_orders_PnL['total_statements_promotion_deal_coupon_fees'] = all_orders_PnL['data_month_last_day'].map(statement_promotion_sum)
all_orders_PnL['total_statements_promotion_deal_coupon_fees'] = all_orders_PnL['total_statements_promotion_deal_coupon_fees'].replace(0, np.nan)
all_orders_PnL['statements_promotion_deal_coupon_fees_allocated'] = np.where(
    (all_orders_PnL['payment_status'] == 'Paid'),
    all_orders_PnL['item_promotion_discount']/all_orders_PnL['total_paid_promotion_per_month']*all_orders_PnL['total_statements_promotion_deal_coupon_fees'],
    np.nan
    )

statement_month_subscription_sum = all_orders_PnL.groupby(['data_month_last_day'])['statements_subscription_fee'].sum()
all_orders_PnL['total_statements_subscription_fee'] = all_orders_PnL['data_month_last_day'].map(statement_month_subscription_sum)
all_orders_PnL['total_statements_subscription_fee'] = all_orders_PnL['total_statements_subscription_fee'].replace(0, np.nan)
all_orders_PnL['statements_subscription_fee_allocated'] = all_orders_PnL.apply(
    lambda row: 0 if row['sales_status'] == 'Non-Sales'
    else row['total_statements_subscription_fee'] / row['total_quantity_per_month'] * row['quantity'],
    axis=1
    )

statement_month_other_sum = all_orders_PnL.groupby(['data_month_last_day'])['statements_other'].sum()
all_orders_PnL['total_statements_other'] = all_orders_PnL['data_month_last_day'].map(statement_month_other_sum)
all_orders_PnL['total_statements_other'] = all_orders_PnL['total_statements_other'].replace(0, np.nan)
all_orders_PnL['statements_other_allocated'] = all_orders_PnL.apply(
    lambda row: 0 if row['sales_status'] == 'Non-Sales'
    else row["total_statements_other"] / row['total_quantity_per_month'] * row['quantity'],
    axis=1
    )

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
# Finalizing all_orders_PnL                                                                                                                                                                                      |
# --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
# reorder columns
missing_cols = [col for col in final_all_orders_PnL if col not in all_orders_PnL.columns]
for col in missing_cols:
    all_orders_PnL[col] = None
all_orders_PnL = all_orders_PnL[final_all_orders_PnL]

# set payment status of non-sales
months_with_unpaid = set(
    all_orders_PnL.loc[
        (all_orders_PnL['sales_status'] == 'Sales') &
        (all_orders_PnL['payment_status'] == 'Unpaid'),
        'data_month_last_day'
    ]
)
mask = (
    (all_orders_PnL['sales_status'] == 'Non-Sales') &
    (all_orders_PnL['data_month_last_day'].notna()) &
    (~all_orders_PnL['data_month_last_day'].isin(months_with_unpaid))
)
all_orders_PnL.loc[mask, 'payment_status'] = 'Paid'

all_orders_PnL['statements_sponsored_products_charge_allocated'] = np.where(
    (all_orders_PnL['data_month_last_day'].isin(months_with_unpaid)),
    all_orders_PnL['sponsored_products_charge'],
    all_orders_PnL['statements_sponsored_products_charge_allocated']
)

# add non-SKU related statement amount
all_orders_PnL['statements_non_sku_adjustments'] = None
statement_details_non_sku_related = statement_details[
    statement_details['amount_type_description'].isin(statement_details_non_sku_related_items)
]
statement_details_non_sku_related['data_month_last_day'] = add_month_end_column(statement_details_non_sku_related['posted_date_time_pst_pdt'])
non_sku_rows = statement_details_non_sku_related.groupby([
    'data_month_last_day',
    'settlement_id',
    'deposit_date_pst_pdt',
    'posted_date_time_pst_pdt'
    ])['amount'].sum().reset_index()
non_sku_rows['sales_status'] = 'Non-Sales'
non_sku_rows['payment_status'] = 'Paid'
non_sku_rows['return_status'] = 'N'
non_sku_rows['non_order_settlement_id'] = non_sku_rows['settlement_id']
non_sku_rows['non_order_deposit_date_pst_pdt'] = non_sku_rows['deposit_date_pst_pdt']
non_sku_rows['non_order_posted_date_pst_pdt'] = non_sku_rows['posted_date_time_pst_pdt']
non_sku_rows['statements_non_sku_adjustments'] = non_sku_rows['amount']
for col in all_orders_PnL.columns:
    if col not in non_sku_rows.columns:
        non_sku_rows[col] = None
non_sku_rows = non_sku_rows[all_orders_PnL.columns]   # reorder columns

all_orders_PnL = pd.concat([all_orders_PnL, non_sku_rows], ignore_index=True)

# clean up rows with all 0s
numeric_cols = all_orders_PnL.select_dtypes(include='number').columns
all_orders_PnL[numeric_cols] = all_orders_PnL[numeric_cols].fillna(0)
row_sum = all_orders_PnL[numeric_cols].sum(axis=1)
all_orders_PnL = all_orders_PnL[row_sum != 0]
all_orders_PnL[numeric_cols] = all_orders_PnL[numeric_cols].replace(0, np.nan)
