"""
Online deployment version of out_of_order_month_table.py
Accepts memory processor instead of reading from local files
"""

import os
import sys
current_directory = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
project_root = os.path.abspath(os.path.join(current_directory, os.pardir, os.pardir, os.pardir, os.pardir))
sys.path.append(project_root)

import pandas as pd
import numpy as np
from backend.processing.functions.config import (
    keep_columns_statement_summary, keep_columns_statement_details,
    commission_rate, sales_tax_service_fee_rate, marketplace_facilitator_tax_principal_rate, marketplace_facilitator_tax_shipping_rate, FBM_shipping_commission_rate, digital_services_fee_rate, subscription_fee,
    rename_dict, ordered_columns_all_orders_PnL,
    must_have_columns_statement_details_pivoted, 
    columns_to_sum_all_orders_PnL, rows_rename_dict_all_orders_PnL_transposed,
    PnL_project_statement_always_try_to_adj_items
)
from backend.processing.functions.input_files import combine_files_same_folder_differentiation
from backend.processing.functions.date_processing import confirm_utc, add_new_utc_to_pst_pdt_column, add_month_end_column, add_convert_to_date_column, remove_time_and_add_convert_to_date_column
from backend.processing.functions.aggregate_statement_no_return import sum_statement_items_nonReturn
from backend.processing.functions.aggregate_statement_return import sum_statement_items_Return

def process_out_of_order_month_booking(memory_processor):
    """
    Process out-of-order month booking data using memory processor for online deployment
    
    Args:
        memory_processor: MemoryFileProcessor instance containing uploaded files
    
    Returns:
        tuple: (Accrued_Adjusted_PnL, return_principal_to_inventory, PnL_month_str, process_statement_deposit_date)
    """
    
    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    # Data Preparation                                                                                                                                                                                               |
    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    # Get files from memory processor
    all_orders = memory_processor.combine_files_same_folder_differentiation('all orders')
    sku_economics = memory_processor.combine_files_same_folder_differentiation('sku economics')
    inbound_shipping = memory_processor.get_single_file('inbound_shipping')
    statements = memory_processor.combine_files_same_folder_differentiation('statements')

    # all_orders processing: successful orders only
    all_orders = all_orders[
        (all_orders['item-status'] != 'Cancelled') &
        (all_orders['quantity'] != 0)
        ]

    # all_orders processing: dates
    all_orders['purchase-date-UTC'] = confirm_utc(all_orders, 'purchase-date')
    all_orders['purchase-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(all_orders, 'purchase-date-UTC')
    all_orders['Data Month Last Day'] = add_month_end_column(all_orders['purchase-date-PST-PDT'])

    all_orders_nonAmazon = all_orders[
        (all_orders['sales-channel'] == 'Non-Amazon')
    ]
    all_orders = all_orders[
        (all_orders['sales-channel'] == 'Amazon.com')
    ]

    # all_orders processing: map monthly SKU sales quantity to SKU in each order in all_orders
    sku_quantity_sum = all_orders.groupby(['Data Month Last Day', 'sku'])['quantity'].sum()
    all_orders['total_quantity_per_sku_per_month'] = all_orders.set_index(['Data Month Last Day', 'sku']).index.map(sku_quantity_sum)
    month_quantity_sum = all_orders.groupby(['Data Month Last Day'])['quantity'].sum()
    all_orders['total_quantity_per_month'] = all_orders.set_index(['Data Month Last Day']).index.map(month_quantity_sum)

    # all_orders processing: for statement to join order date
    all_orders_statement_order_date = all_orders[['amazon-order-id', 'Data Month Last Day','sku']].drop_duplicates()
    all_orders_NonAmazon_statement_order_date = all_orders_nonAmazon[['amazon-order-id', 'Data Month Last Day','sku']].drop_duplicates()

    # sku_economics processing: dates
    sku_economics['Start date'] = add_convert_to_date_column(sku_economics, 'Start date')
    sku_economics['End date'] = add_convert_to_date_column(sku_economics, 'End date')
    sku_economics['Data Month Last Day'] = add_month_end_column(sku_economics['End date'])

    # sku_economics processing: numeric columns
    sku_economics[['FBA fulfilment fees total', 'Sponsored Products charge total', 'Monthly inventory storage fee total', 'Inbound transportation charge total']].apply(pd.to_numeric, errors='coerce').round(2)

    # inbound_shipping processing: dates
    inbound_shipping['Created Date'] = remove_time_and_add_convert_to_date_column(inbound_shipping, 'Created')

    # statements processing: dates
    statements['deposit-date-UTC'] = confirm_utc(statements, 'deposit-date', format='%Y-%m-%d %H:%M:%S %Z')
    statements['deposit-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(statements, 'deposit-date-UTC')

    statements['posted-date-UTC'] = confirm_utc(statements, 'posted-date-time', format='%Y-%m-%d %H:%M:%S %Z')
    statements['posted-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(statements, 'posted-date-UTC')

    statements['settlement-start-date-UTC'] = confirm_utc(statements, 'settlement-start-date', format='%Y-%m-%d %H:%M:%S %Z')
    statements['settlement-start-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(statements, 'settlement-start-date-UTC')

    statements['settlement-end-date-UTC'] = confirm_utc(statements, 'settlement-end-date', format='%Y-%m-%d %H:%M:%S %Z')
    statements['settlement-end-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(statements, 'settlement-end-date-UTC')

    # statements processing: settlement-id to string
    statements['settlement-id'] = statements['settlement-id'].astype(int).apply(lambda x: f'{x:.0f}')

    # statements processing: summary of all statements - contain Statement ID, Deposit Date, and Total Amount for later look-up
    statement_summary = statements[
        (statements['transaction-type'].isna()) 
        ]
    statement_summary = statement_summary[keep_columns_statement_summary]

    # statements processing: statement details table - non summary row with settlement start & end date and deposit-date
    statement_details = statements[
        (statements['transaction-type'].notna()) 
        ]
    statement_details = statement_details[keep_columns_statement_details]
    statement_details['quantity-purchased'] = statement_details['quantity-purchased'].fillna(0).astype(int)
    statement_details['quantity-purchased'] = statement_details['quantity-purchased'].apply(lambda x: f'{x:.0f}')
    statement_details['amount-type-description'] = statement_details['amount-type'] + ': ' + statement_details['amount-description']

    statement_details = pd.merge(
        statement_details, 
        statement_summary, 
        left_on=['settlement-id'], 
        right_on=['settlement-id'],
        how='left'
        )

    # find all_orders unique month to generate P&L for each month
    PnL_month = all_orders['Data Month Last Day'].dropna().unique()
    PnL_month = PnL_month[0]

    # differentiate in-order-month deposits and out-of-order month deposits
    statement_details['deposit flag'] = statement_details['deposit-date-PST-PDT'].apply(lambda x: 'In-Order-Month Deposits' if x <= PnL_month else 'Out-Of-Order-Month Deposits')

    # NonAmazon_amount (MCF Fees) 
    statement_details_nonAmazon = statement_details[
        (statement_details['marketplace-name'] == 'Non-Amazon') &
        (statement_details['deposit flag'] == 'Out-Of-Order-Month Deposits')
        ]
    statement_details_nonAmazon = pd.merge(
        statement_details_nonAmazon, 
        all_orders_NonAmazon_statement_order_date, 
        left_on=['order-id'], 
        right_on=['amazon-order-id'],
        how='left'
        )
    statement_details_nonAmazon = statement_details_nonAmazon[
        statement_details_nonAmazon['amazon-order-id'].notna() 
        ]
    NonAmazon_amount = statement_details_nonAmazon['amount'].sum()

    # statement_details (Amazon CA)
    statement_details = statement_details[
        statement_details['marketplace-name'] != 'Non-Amazon'
        ]

    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    # Project P&L                                                                                                                                                                                                    |
    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    # join all_orders with sku_economics to calculate expected expenses (FBA Fulfillment Fee, Sponsored Products Charge, Storage Fee, Subscription Fee)
    filtered_orders = all_orders[
        (all_orders['Data Month Last Day'] == PnL_month)
        ]
    numeric_cols = sku_economics.select_dtypes(include='number').columns
    filtered_sku_economics = sku_economics[
        (sku_economics[numeric_cols].sum(axis=1) != 0)
        & (sku_economics['Data Month Last Day'] == PnL_month)
        ]
    filtered_sku_economics = filtered_sku_economics[
        ['Data Month Last Day', 'Amazon store', 'Start date', 'End date', 'MSKU', 'Currency code', 
        'FBA fulfilment fees total', 'Sponsored Products charge total', 'Monthly inventory storage fee total']
        ]
    all_orders_PnL = pd.merge(
        filtered_orders, 
        filtered_sku_economics, 
        left_on=['Data Month Last Day', 'sku'], 
        right_on=['Data Month Last Day', 'MSKU'],
        how='outer'
        )

    all_orders_PnL['sales_status'] = all_orders_PnL['quantity'].apply(lambda x: 'Non-Sales' if pd.isna(x) or x == 0 else 'Sales')
    all_orders_PnL['sku'] = all_orders_PnL.apply(lambda row: row['MSKU'] if row['sales_status'] == 'Non-Sales' and pd.isna(row['sku']) else row['sku'], axis=1)
    all_orders_PnL = all_orders_PnL.drop(columns=['MSKU','Amazon store', 'Start date', 'End date', 'Currency code'])

    all_orders_PnL['Commission'] = all_orders_PnL['item-price']*commission_rate
    all_orders_PnL['FBA Fulfillment Fee'] = all_orders_PnL.apply(
        lambda row: row['FBA fulfilment fees total'] if row['sales_status'] == 'Non-Sales' 
        else (row['FBA fulfilment fees total'] / row['total_quantity_per_sku_per_month']) * row['quantity'],
        axis=1
        )
    all_orders_PnL['Sales Tax Service Fee'] = np.nan
    all_orders_PnL['Marketplace Facilitator Tax Principal'] = all_orders_PnL['item-tax'] * marketplace_facilitator_tax_principal_rate
    all_orders_PnL['Marketplace Facilitator Tax Shipping'] = all_orders_PnL['shipping-tax'] * marketplace_facilitator_tax_shipping_rate
    all_orders_PnL['FBM Shipping Commission'] = all_orders_PnL['quantity']*FBM_shipping_commission_rate
    all_orders_PnL['FBM Shipping Commission'] = all_orders_PnL.apply(lambda row: np.nan if row['fulfillment-channel'] == 'Amazon' else row['FBM Shipping Commission'], axis=1)
    all_orders_PnL['Digital Services Fee'] = np.nan

    all_orders_PnL['Sponsored Products Charge'] = all_orders_PnL.apply(
        lambda row: row['Sponsored Products charge total'] if row['sales_status'] == 'Non-Sales' 
        else (row['Sponsored Products charge total'] / row['total_quantity_per_sku_per_month']) * row['quantity'],
        axis=1
        )
    all_orders_PnL['Storage Fee'] = all_orders_PnL.apply(
        lambda row: row['Monthly inventory storage fee total'] 
        if row['sales_status'] == 'Non-Sales' 
        or pd.isna(row['total_quantity_per_sku_per_month'])
        or row['total_quantity_per_sku_per_month'] == 0
        else (row['Monthly inventory storage fee total'] / row['total_quantity_per_sku_per_month']) * row['quantity'],
        axis=1
        )
    all_orders_PnL['Subscription Fee'] = all_orders_PnL.apply(
        lambda row: 0 if row['sales_status'] == 'Non-Sales' 
        else (subscription_fee / row['total_quantity_per_month']) * row['quantity'],
        axis=1
        )

    # join all_orders with sku_economics and inbound_shipping to calculate expected expenses (FBA Inbound Transportation Fee)
    filtered_inbound_shipping = inbound_shipping[inbound_shipping['Created Date'] <= PnL_month]
    filtered_inbound_shipping = filtered_inbound_shipping.groupby('MSKU')['Units expected'].sum().reset_index()
    all_orders_PnL = pd.merge(
        all_orders_PnL, 
        filtered_inbound_shipping, 
        left_on=['sku'], 
        right_on=['MSKU'],
        how='left'
        )
    all_orders_PnL = all_orders_PnL.drop(columns=['MSKU'])

    filtered_sku_economics_inbound = sku_economics[
        (sku_economics[numeric_cols].sum(axis=1) != 0)
        & (sku_economics['End date'] <= PnL_month)
        ]
    filtered_sku_economics_inbound = filtered_sku_economics_inbound.groupby(['MSKU']).agg({
        'Inbound transportation charge total': 'sum',
        }).reset_index()
    all_orders_PnL = pd.merge(
        all_orders_PnL, 
        filtered_sku_economics_inbound, 
        left_on=['sku'], 
        right_on=['MSKU'],
        how='left'
        )
    all_orders_PnL = all_orders_PnL.drop(columns=['MSKU'])

    all_orders_PnL['FBA Inbound Transportation Fee'] = all_orders_PnL.apply(
        lambda row: 0 if row['sales_status'] == 'Non-Sales' 
        else (row['Inbound transportation charge total'] / row['Units expected']) * row['quantity'],
        axis=1
        )

    # finalize all_orders_PnL by Sales and Non-Sales Sponsored Products Charge
    all_orders_PnL['Advertising Fee for Sales'] = np.where(
        all_orders_PnL['sales_status'] != 'Non-Sales', 
        all_orders_PnL['Sponsored Products Charge'], 
        np.nan
        )
    all_orders_PnL['Advertising Fee for Non-Sales'] = np.where(
        all_orders_PnL['sales_status'] == 'Non-Sales', 
        all_orders_PnL['Sponsored Products Charge'], 
        np.nan
        )

    all_orders_PnL = all_orders_PnL[ordered_columns_all_orders_PnL]

    # aggregate current result for sku summary on revenue and expenses
    sku_summary = all_orders_PnL.groupby(['sku', 'sales_status']).agg({
        'quantity': 'sum',

        'item-price': 'sum',
        'shipping-price': 'sum',
        'gift-wrap-price': 'sum',
        
        'item-tax': 'sum',
        'shipping-tax': 'sum',
        'gift-wrap-tax': 'sum',

        'Commission': 'sum',
        'FBA Fulfillment Fee': 'sum',
        'Sales Tax Service Fee': 'sum',
        'Marketplace Facilitator Tax Principal': 'sum',
        'Marketplace Facilitator Tax Shipping': 'sum',
        'FBM Shipping Commission': 'sum',
        'Digital Services Fee': 'sum',

        'Sponsored Products Charge': 'sum',
        'Advertising Fee for Sales': 'sum',
        'Advertising Fee for Non-Sales': 'sum',
        'item-promotion-discount': 'sum',
        'ship-promotion-discount': 'sum',

        'FBA Inbound Transportation Fee': 'sum',
        'Subscription Fee': 'sum',
        'Storage Fee': 'sum'
        }).reset_index()

    # final Project SKU-level P&L
    sku_PnL = sku_summary.rename(columns=rename_dict)
    columns_to_negate_sku_PnL = [
        'Commission', 'FBA Fulfillment Fee', 'Sales Tax Service Fee', 
        'Marketplace Facilitator Tax Principal', 'Marketplace Facilitator Tax Shipping',
        'FBM Shipping Commission', 'Digital Services Fee',
        'Sponsored Products Charge', 'Advertising Fee for Sales', 'Advertising Fee for Non-Sales',
        'Product Sales Promotion', 'Shipping Promotion', 
        'FBA Inbound Transportation Fee', 'Subscription Fee', 'Storage Fee'
    ]
    sku_PnL[columns_to_negate_sku_PnL] = sku_PnL[columns_to_negate_sku_PnL] * -1

    sales_status_order = pd.Categorical(
        sku_PnL['Sales Status'], 
        categories=['Sales', 'Non-Sales'], 
        ordered=True
    )
    sku_PnL['Sales Status'] = sales_status_order
    sku_PnL = sku_PnL.sort_values(by=['Sales Status', 'Sales Principal', 'Units Sold'], ascending=[True, False, False])
    sku_PnL = sku_PnL[[
        'Sales Status', 'SKU',
        'Units Sold', 
        'Sales Principal',
        'Shipping', 'Gift Wrap', 'Sales Tax', 
        'Shipping Tax', 'Gift Wrap Tax', 
        'Commission', 'FBA Fulfillment Fee', 'Sales Tax Service Fee', 
        'Marketplace Facilitator Tax Principal', 'Marketplace Facilitator Tax Shipping',
        'FBM Shipping Commission', 'Digital Services Fee',
        'Sponsored Products Charge', 'Advertising Fee for Sales', 'Advertising Fee for Non-Sales',
        'Product Sales Promotion', 'Shipping Promotion',
        'FBA Inbound Transportation Fee', 'Subscription Fee', 'Storage Fee'
    ]]
    sku_PnL = sku_PnL.reset_index(drop=True)

    numeric_cols = sku_PnL.select_dtypes(include='number').columns
    sku_PnL = sku_PnL[
        (sku_PnL[numeric_cols].sum(axis=1) != 0)
        ]

    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    # Statement Processing                                                                                                                                                                                           |
    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    # filter statements for order month only
    first_day_PnL_month = PnL_month.replace(day=1)

    # pivot statement details table - reorganize to have each amount-type-description seperately as columns (mimic all_orders data structure)
    statement_details.fillna('Missing', inplace=True) # to ensure pivot, only category columns in statement_details will have blank value (e.g. non-order related amount rows)
    statement_details_filtered = statement_details[[
        'settlement-id', 'settlement-start-date-PST-PDT', 'settlement-end-date-PST-PDT', 'deposit-date-UTC', 'deposit-date-PST-PDT',
        'posted-date-time','posted-date-UTC', 'posted-date-PST-PDT', 'marketplace-name', 'transaction-type',
        'order-id', 'sku', 'quantity-purchased', 'deposit flag',
        'amount-type-description', 
        'amount'
    ]]
    statement_details_pivoted = pd.pivot_table(
        statement_details_filtered,
        values='amount',
        index=['settlement-id', 'settlement-start-date-PST-PDT', 'settlement-end-date-PST-PDT', 'deposit-date-UTC', 'deposit-date-PST-PDT',
            'posted-date-time','posted-date-UTC', 'posted-date-PST-PDT', 'marketplace-name', 'transaction-type',
            'order-id', 'sku', 'quantity-purchased', 'deposit flag'],
        columns='amount-type-description',
        aggfunc='sum',
        fill_value=0
        ).reset_index()
    statement_details_pivoted.columns.name = None
    statement_details_pivoted.replace('Missing', np.nan, inplace=True)
    statement_details_pivoted['quantity-purchased'] = statement_details_pivoted['quantity-purchased'].astype(int)

    # pivoted statement details table - join all orders table for order date
    filtered_all_orders_statement_order_date = all_orders_statement_order_date[
        (all_orders_statement_order_date['Data Month Last Day'] == PnL_month)
        ]
    statement_details_pivoted = pd.merge(
        statement_details_pivoted, 
        filtered_all_orders_statement_order_date, 
        left_on=['order-id','sku'], 
        right_on=['amazon-order-id','sku'],
        how='left'
        )
    statement_details_pivoted['Data Month Last Day'] = pd.to_datetime(statement_details_pivoted['Data Month Last Day'], errors='coerce')
    statement_details_pivoted['Data Month Last Day'] = statement_details_pivoted['Data Month Last Day'].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) else '') # string type for generating 'all order PnL Date'

    statement_details_pivoted['all order PnL Date'] = np.where(
        (statement_details_pivoted['order-id'].notna()) & (statement_details_pivoted['amazon-order-id'].isna()),
        'Orders not in all order dataset',
        statement_details_pivoted['Data Month Last Day']
        )
    statement_details_pivoted = statement_details_pivoted.drop(columns=['amazon-order-id', 'Data Month Last Day'])

    # ensure all must-have columns are there/get initialized
    for column in must_have_columns_statement_details_pivoted:
        if column not in statement_details_pivoted.columns:
            statement_details_pivoted[column] = np.nan  
    # other columns will be non-general 'amount-type-description' type, add them after the must-have columns
    all_columns_statement_details_pivoted = statement_details_pivoted.columns.tolist()
    remaining_columns_statement_details_pivoted = [col for col in all_columns_statement_details_pivoted if col not in must_have_columns_statement_details_pivoted]
    statement_details_pivoted = statement_details_pivoted[must_have_columns_statement_details_pivoted + remaining_columns_statement_details_pivoted]

    # all_orders_PnL with paid/unpaid indicator
    statement_in_order_month_deposited = statement_details_pivoted[
        (statement_details_pivoted['deposit flag'] == 'In-Order-Month Deposits')
        ]
    statement_out_order_month_deposited = statement_details_pivoted[
        (statement_details_pivoted['deposit flag'] == 'Out-Of-Order-Month Deposits')
        ]

    statement_in_order_month_deposited_for_order_id = statement_in_order_month_deposited[
        (statement_in_order_month_deposited['transaction-type'] == 'Order')
        ]
    statement_out_order_month_deposited_for_order_id = statement_out_order_month_deposited[
        (statement_out_order_month_deposited['transaction-type'] == 'Order')
        ]

    statement_unique_order_ids_in_order_month_deposit = statement_in_order_month_deposited_for_order_id['order-id'].dropna().unique()
    statement_unique_order_ids_out_order_month_deposit = statement_out_order_month_deposited_for_order_id['order-id'].dropna().unique()
    all_orders_PnL['Payment Status'] = all_orders_PnL['amazon-order-id'].apply(
        lambda x: 'Paid' if pd.isna(x) else ('Paid' if x in statement_unique_order_ids_in_order_month_deposit else 'Unpaid')
    )
    all_orders_PnL['Payment Status - After Order Month'] = all_orders_PnL['amazon-order-id'].apply(
        lambda x: 'Paid' if pd.isna(x) else ('Paid - After Order Month' if x in statement_unique_order_ids_out_order_month_deposit else 'Unpaid')
    )
    all_orders_PnL.loc[all_orders_PnL['Payment Status'] == 'Paid', 'Payment Status - After Order Month'] = 'Paid'

    all_orders_PnL['Payment Status In & After Order Month'] = (
        "In Order Month - " 
        + all_orders_PnL['Payment Status'] 
        + " & " 
        + all_orders_PnL['Payment Status - After Order Month'])
    all_orders_PnL = all_orders_PnL.drop(columns=['Payment Status', 'Payment Status - After Order Month'])

    all_orders_PnL = all_orders_PnL[
        (all_orders_PnL['Payment Status In & After Order Month'] == 'In Order Month - Unpaid & Paid - After Order Month')
        ]


    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    # sku PnL reconciliation with statement                                                                                                                                                                          |
    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    first_day_PnL_month = PnL_month.replace(day=1)
    statement_out_order_month_deposited = statement_out_order_month_deposited.drop(columns=['deposit flag'])
    Statement_nonRefund_PnL = sum_statement_items_nonReturn(statement_out_order_month_deposited, PnL_month, first_day_PnL_month)

    # Project P&L Values based on all_orders_PnL during generating sku_PnL
    Project_PnL_toReconcile = all_orders_PnL.groupby(['Payment Status In & After Order Month'])[columns_to_sum_all_orders_PnL].sum().T
    # Project_PnL_toReconcile = Project_PnL_toReconcile.drop(columns=['In Order Month - Paid & Paid'])
    Project_PnL_toReconcile = Project_PnL_toReconcile.rename(index=rows_rename_dict_all_orders_PnL_transposed)
    Project_PnL_toReconcile = Project_PnL_toReconcile.reset_index()
    Project_PnL_toReconcile = Project_PnL_toReconcile.rename(columns={'index': 'Project PnL Items'})
    Project_PnL_toReconcile.columns.name = None
    if 'In Order Month - Unpaid & Paid - After Order Month' in Project_PnL_toReconcile.columns:
        Project_PnL_toReconcile.rename(columns={'In Order Month - Unpaid & Paid - After Order Month': 'Project PnL Paid after Order Month End: Past Unpaid Estimate'}, inplace=True)
    else:
        Project_PnL_toReconcile['Project PnL Paid after Order Month End: Past Unpaid Estimate'] = np.nan
    if 'In Order Month - Unpaid & Unpaid' in Project_PnL_toReconcile.columns:
        Project_PnL_toReconcile.rename(columns={'In Order Month - Unpaid & Unpaid': 'Project PnL Unpaid'}, inplace=True)
    else:
        Project_PnL_toReconcile['Project PnL Unpaid'] = np.nan

    Project_PnL_toReconcile.loc[Project_PnL_toReconcile['Project PnL Items'].isin(columns_to_negate_sku_PnL), 
        ['Project PnL Paid after Order Month End: Past Unpaid Estimate', 'Project PnL Unpaid']] *= -1

    # Have Subscription Fee and Storage Fee as all "Paid Orders" - no inter-period processing for these items
    Project_PnL_toReconcile.loc[
        Project_PnL_toReconcile['Project PnL Items'] == 'Subscription Fee', 
        ['Project PnL Paid after Order Month End: Past Unpaid Estimate', 'Project PnL Unpaid']
    ] = [0,0]
    Project_PnL_toReconcile.loc[
        Project_PnL_toReconcile['Project PnL Items'] == 'Storage Fee', 
        ['Project PnL Paid after Order Month End: Past Unpaid Estimate', 'Project PnL Unpaid']
    ] = [0,0]

    # Join Statement P&L Values and Project P&L Values
    Statement_Project_PnL_Reconciliation = pd.merge(
        Statement_nonRefund_PnL, 
        Project_PnL_toReconcile, 
        left_on=['Statement PnL Items'], 
        right_on=['Project PnL Items'],
        how='outer'
        )

    Statement_Project_PnL_Reconciliation[
            ['Project PnL Paid after Order Month End: Past Unpaid Estimate', 'Project PnL Unpaid']
        ] = Statement_Project_PnL_Reconciliation[
            ['Project PnL Paid after Order Month End: Past Unpaid Estimate', 'Project PnL Unpaid']
        ].fillna(0)

    # Statement P&L does not differentiate Advertising Fee between Sales and Non-Sales. 
    # Have Statement P&L Advertising Fee for Non-Sales = Project P&L Advertising Fee for Non-Sales
    # Have Statement P&L Advertising Fee for Sales = Statement P&L Sponsored Products Charge - Project P&L Advertising Fee for Non-Sales
    Statement_Project_PnL_Reconciliation['Statement Values'] = np.where(
        (Statement_Project_PnL_Reconciliation['Project PnL Items'] == 'Advertising Fee for Non-Sales'),
        Statement_Project_PnL_Reconciliation['Project PnL Paid after Order Month End: Past Unpaid Estimate'] + Statement_Project_PnL_Reconciliation['Project PnL Unpaid'],
        Statement_Project_PnL_Reconciliation['Statement Values']
        )
    statement_sponsored_products_charge_value = Statement_Project_PnL_Reconciliation.loc[
        Statement_Project_PnL_Reconciliation['Statement PnL Items'] == 'Sponsored Products Charge',
        'Statement Values'
        ].values[0]
    statement_ad_nonsale_value = Statement_Project_PnL_Reconciliation.loc[
        Statement_Project_PnL_Reconciliation['Project PnL Items'] == 'Advertising Fee for Non-Sales',
        'Statement Values'
        ].values[0]
    Statement_Project_PnL_Reconciliation['Statement Values'] = np.where(
        (Statement_Project_PnL_Reconciliation['Project PnL Items'] == 'Advertising Fee for Sales'),
        statement_sponsored_products_charge_value - statement_ad_nonsale_value,
        Statement_Project_PnL_Reconciliation['Statement Values']
        )

    Statement_Project_PnL_Reconciliation['Statement PnL Items'] = np.where(
        (Statement_Project_PnL_Reconciliation['Statement PnL Items'].isna()),
        Statement_Project_PnL_Reconciliation['Project PnL Items'],
        Statement_Project_PnL_Reconciliation['Statement PnL Items']
        )

    # Find mising items
    Statement_Project_PnL_Reconciliation['Missing Items - Accrued PnL to Add'] = Statement_Project_PnL_Reconciliation.apply(
        lambda row: (
            row['Statement Values'] 
            if pd.isna(row['Project PnL Items']) 
            and pd.notna(row['Statement PnL Items']) 
            and row['Statement Values'] != 0 
            else np.nan
        ),
        axis=1
    )

    # Find adjustment items for items in Project P&L 
    Statement_Project_PnL_Reconciliation['Adjustment Items - Accrued Adjusted PnL to Adjust'] = Statement_Project_PnL_Reconciliation.apply(
        lambda row: (
            (row['Statement Values'] - row['Project PnL Paid after Order Month End: Past Unpaid Estimate']) 
            if row['Statement PnL Items'] in PnL_project_statement_always_try_to_adj_items
            else np.nan
        ),
        axis=1
    )
    Statement_Project_PnL_Reconciliation['Adjustment Items - Accrued Adjusted PnL to Adjust'] = Statement_Project_PnL_Reconciliation.apply(
        lambda row: (
            np.nan
            if abs(row['Adjustment Items - Accrued Adjusted PnL to Adjust']) < 0.005
            else row['Adjustment Items - Accrued Adjusted PnL to Adjust']
        ),
        axis=1
    )

    # Find FBA Inbound Transportation Fee Diff, indicate it should be record in Balance Sheet Asset
    statement_inbound_transportation_fee_adjustment_value = Statement_Project_PnL_Reconciliation.loc[
        Statement_Project_PnL_Reconciliation['Statement PnL Items'] == 'FBA Inbound Transportation Fee',
        'Adjustment Items - Accrued Adjusted PnL to Adjust'
    ].values[0]
    Statement_Project_PnL_Reconciliation['Adjustment Items - Accrued Adjusted PnL to Adjust'] = np.where(
        (Statement_Project_PnL_Reconciliation['Statement PnL Items'] == 'FBA Inbound Transportation Fee'),
        np.nan,
        Statement_Project_PnL_Reconciliation['Adjustment Items - Accrued Adjusted PnL to Adjust']
        )
    Statement_Project_PnL_Reconciliation['FBA Inbound Transportation Fee Diff to Balance Sheet Asset'] = np.nan
    Statement_Project_PnL_Reconciliation['FBA Inbound Transportation Fee Diff to Balance Sheet Asset'] = np.where(
        (Statement_Project_PnL_Reconciliation['Statement PnL Items'] == 'FBA Inbound Transportation Fee'),
        statement_inbound_transportation_fee_adjustment_value*(-1),
        Statement_Project_PnL_Reconciliation['FBA Inbound Transportation Fee Diff to Balance Sheet Asset']
        )

    # Add Category indicator that this section is for all non-return P&L Items
    Statement_Project_PnL_Reconciliation.insert(0, 'Statement Category', 'Non-Return')

    # Sort PnL Items based on desired P&L structure
    Statement_Project_PnL_Reconciliation['sort_key'] = Statement_Project_PnL_Reconciliation['Statement PnL Items'].apply(
        lambda x: PnL_project_statement_always_try_to_adj_items.index(x) if x in PnL_project_statement_always_try_to_adj_items else len(PnL_project_statement_always_try_to_adj_items)
    )
    Statement_Project_PnL_Reconciliation = Statement_Project_PnL_Reconciliation.sort_values(by=['sort_key'])
    Statement_Project_PnL_Reconciliation = Statement_Project_PnL_Reconciliation.drop(columns=['sort_key'])
    Statement_Project_PnL_Reconciliation = Statement_Project_PnL_Reconciliation.reset_index(drop=True)

    # Prepare Return Items
    Statement_ReturnPnL = sum_statement_items_Return(statement_out_order_month_deposited, PnL_month)

    # Add Category indicator that this section is for all return P&L Items
    Statement_ReturnPnL.insert(0, 'Statement Category', 'Return')

    # Add other columns for later concating with Statement_Project_PnL_Reconciliation
    Statement_ReturnPnL['Project PnL Items'] = np.nan
    Statement_ReturnPnL['Project PnL Paid after Order Month End: Past Unpaid Estimate'] = np.nan
    Statement_ReturnPnL['Project PnL Unpaid'] = np.nan
    Statement_ReturnPnL['Missing Items - Accrued PnL to Add'] = np.nan
    Statement_ReturnPnL['Adjustment Items - Accrued Adjusted PnL to Adjust'] = np.nan
    Statement_ReturnPnL['FBA Inbound Transportation Fee Diff to Balance Sheet Asset'] = np.nan

    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    # Final Accrued Adjusted PnL                                                                                                                                                                                     |
    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    Accrued_Adjusted_PnL = pd.concat([Statement_Project_PnL_Reconciliation, Statement_ReturnPnL], axis=0, ignore_index=True)

    Accrued_Adjusted_PnL['Return Items - Accrued Adjusted PnL to Adjust'] = Accrued_Adjusted_PnL.apply(
        lambda row: (
            row['Statement Values']
            if (row['Statement Category'] == 'Return') & ( row['Statement Values'] != 0)
            else None
        ),
        axis=1
    )

    # Final Accrued_Adjusted_PnL based on
    # 1. for non-return always in Project P&L items, Accrued_Adjusted_PnL = Project P&L Paid Amount + Adjustment Amount + Project P&L Unpaid Amount
    # 2. for non-return missing in Project P&L items, Accrued_Adjusted_PnL = Statement P&L Missing Items in Project P&L Amount
    # 2. for return items, Accrued_Adjusted_PnL = Statement Return Items Amount
    Accrued_Adjusted_PnL['Accrued Adjusted Values'] = Accrued_Adjusted_PnL.apply(
        lambda row: (
            (0 if pd.isna(row['Project PnL Paid after Order Month End: Past Unpaid Estimate']) else row['Project PnL Paid after Order Month End: Past Unpaid Estimate']) +
            (0 if pd.isna(row['Project PnL Unpaid']) else row['Project PnL Unpaid']) +
            (0 if pd.isna(row['Adjustment Items - Accrued Adjusted PnL to Adjust']) else row['Adjustment Items - Accrued Adjusted PnL to Adjust'])
            if (row['Statement Category'] == 'Non-Return') and (row['Statement PnL Items'] in PnL_project_statement_always_try_to_adj_items)
            else (
                (0 if pd.isna(row['Missing Items - Accrued PnL to Add']) or row['Missing Items - Accrued PnL to Add'] == 0 else row['Missing Items - Accrued PnL to Add'])
                if (row['Statement Category'] == 'Non-Return') 
                else (
                    (0 if pd.isna(row['Return Items - Accrued Adjusted PnL to Adjust']) else row['Return Items - Accrued Adjusted PnL to Adjust'])
                    if (row['Statement Category'] == 'Return')
                    else 0
                )
            )
        ),
        axis=1
    )

    Accrued_Adjusted_PnL = Accrued_Adjusted_PnL[
        (Accrued_Adjusted_PnL['Statement PnL Items'] != 'Sponsored Products Charge') 
    ]

    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    # Return to Inventory Asset Value                                                                                                                                                                                |
    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    PnL_month_str = PnL_month.strftime('%Y-%m-%d')

    return_principal_to_inventory = statement_out_order_month_deposited[
        ((statement_out_order_month_deposited['transaction-type'] == 'Refund') 
        | (statement_out_order_month_deposited['transaction-type'] == 'Chargeback Refund')
        | (statement_out_order_month_deposited['transaction-type'] == 'A-to-z Guarantee Refund'))
        & 
        (statement_out_order_month_deposited['all order PnL Date'] == PnL_month_str)
    ]['ItemPrice: Principal'].sum()


    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    # Non-Amazon CA Row for MCF Fees                                                                                                                                                                              |
    # ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    new_row = {col: None for col in Accrued_Adjusted_PnL.columns}
    new_row["Statement Category"] = "Non-Amazon"
    new_row["Statement PnL Items"] = "Non-Amazon"
    new_row["Missing Items - Accrued PnL to Add"] = NonAmazon_amount
    Accrued_Adjusted_PnL = pd.concat([Accrued_Adjusted_PnL, pd.DataFrame([new_row])], ignore_index=True)

    process_statement_deposit_date = statement_out_order_month_deposited['deposit-date-PST-PDT'].dropna().unique()
    process_statement_deposit_date = process_statement_deposit_date[0].strftime('%Y-%m-%d')
    
    return Accrued_Adjusted_PnL, return_principal_to_inventory, PnL_month_str, process_statement_deposit_date
