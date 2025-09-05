"""
Memory-based version of statement_decomp_table for online deployment
Accepts MemoryFileProcessor instead of reading from local files
"""

import pandas as pd
import numpy as np
from backend.processing.functions.config import keep_columns_statement_summary
from backend.processing.functions.date_processing import confirm_utc, add_new_utc_to_pst_pdt_column, add_month_end_column

def accounting_format(x):
    if pd.isna(x) or x == 0:
        return ""
    if x < 0:
        return f'(${abs(x):,.2f})'
    return f'${x:,.2f}'

def statement_decomp_table_memory(memory_processor):
    """
    Process statement decomposition using memory processor for online deployment
    
    Args:
        memory_processor: MemoryFileProcessor instance containing uploaded files
    
    Returns:
        str: HTML table string
    """
    
    # Get files from memory processor
    all_orders = memory_processor.combine_files_same_folder_differentiation('all orders')
    statements = memory_processor.get_single_file('deposit_statement')

    # all_orders processing: successful orders only
    all_orders = all_orders[
        (all_orders['item-status'] != 'Cancelled') &
        (all_orders['quantity'] != 0) &
        (~all_orders['item-price'].isna())
        ]

    # all_orders processing: dates
    all_orders['purchase-date-UTC'] = confirm_utc(all_orders, 'purchase-date')
    all_orders['purchase-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(all_orders, 'purchase-date-UTC')
    all_orders['Data Month Last Day'] = add_month_end_column(all_orders['purchase-date-PST-PDT'])

    # all_orders processing: for statement to join order date
    all_orders_statement_order_date = all_orders[['amazon-order-id', 'Data Month Last Day','sku']].drop_duplicates()

    # statements processing: dates
    statements['deposit-date-UTC'] = confirm_utc(statements, 'deposit-date', format='%Y-%m-%d %H:%M:%S %Z')
    statements['deposit-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(statements, 'deposit-date-UTC')
    statements['posted-date-UTC'] = confirm_utc(statements, 'posted-date-time', format='%Y-%m-%d %H:%M:%S %Z')
    statements['posted-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(statements, 'posted-date-UTC')
    statements['settlement-start-date-UTC'] = confirm_utc(statements, 'settlement-start-date', format='%Y-%m-%d %H:%M:%S %Z')
    statements['settlement-start-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(statements, 'settlement-start-date-UTC')
    statements['settlement-end-date-UTC'] = confirm_utc(statements, 'settlement-end-date', format='%Y-%m-%d %H:%M:%S %Z')
    statements['settlement-end-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(statements, 'settlement-end-date-UTC')

    deposit_month = pd.to_datetime(statements['deposit-date-PST-PDT'].dropna().unique(), errors='coerce')
    deposit_month = deposit_month[0].strftime('%B %Y')

    deposit_date = pd.to_datetime(statements['deposit-date-PST-PDT'].dropna().unique(), errors='coerce')
    deposit_date = deposit_date[0].strftime('%B %d, %Y')

    # statements processing: settlement-id to string
    statements['settlement-id'] = statements['settlement-id'].astype(int).apply(lambda x: f'{x:.0f}')

    # statements processing: summary of all statements - contain Statement ID, Deposit Date, and Total Amount for later look-up
    statement_summary = statements[(statements['transaction-type'].isna()) ]
    statement_summary = statement_summary[keep_columns_statement_summary]

    # statements processing: statement details table - non summary row with settlement start & end date and deposit-date
    statement_details = statements[(statements['transaction-type'].notna())]
    statement_details = pd.merge(
        statement_details, 
        statement_summary, 
        left_on=['settlement-id'], 
        right_on=['settlement-id'],
        how='left'
    )

    # Order & Refund rows to use "Order Date" as "Booking Month"
    statement_details_join_order = statement_details[
        (statement_details['transaction-type'].notna()) &
        ((statement_details['transaction-type'] == 'Order') | 
        (statement_details['transaction-type'] == 'Refund') | 
        (statement_details['transaction-type'] == 'Chargeback Refund') |
        (statement_details['transaction-type'] == 'A-to-z Guarantee Refund'))
    ]
    statement_details_join_order = pd.merge(
        statement_details_join_order, 
        all_orders_statement_order_date, 
        left_on=['order-id','sku'], 
        right_on=['amazon-order-id','sku'],
        how='left'
    )

    # Other rows to use "Post Date" as "Booking Month"
    statement_details_not_join_order = statement_details[
        (statement_details['transaction-type'].notna()) &
        ((statement_details['transaction-type'] != 'Order') &
        (statement_details['transaction-type'] != 'Refund') &
        (statement_details['transaction-type'] != 'Chargeback Refund') &
        (statement_details['transaction-type'] != 'A-to-z Guarantee Refund'))
    ]

    # Concatenate the DataFrames
    final_statement_details = pd.concat([statement_details_join_order, statement_details_not_join_order], ignore_index=True)

    # Create guide statement decomp table
    final_statement_details['Data Month Last Day'] = pd.to_datetime(final_statement_details['Data Month Last Day'], errors='coerce')
    final_statement_details['posted-date-PST-PDT'] = pd.to_datetime(final_statement_details['posted-date-PST-PDT'], errors='coerce')
    final_statement_details['order month'] = final_statement_details['Data Month Last Day'].dt.strftime('%B %Y')
    final_statement_details['post month'] = final_statement_details['posted-date-PST-PDT'].dt.strftime('%B %Y')

    order_deposit_table = final_statement_details[(final_statement_details['Data Month Last Day'].notna())].groupby(['order month'])['amount'].sum().reset_index()
    order_deposit_table = order_deposit_table.rename(columns = {'order month':'Order Month', 'amount':'Project PnL Related Deposited Amount'})

    non_order_deposit_table = final_statement_details[(final_statement_details['Data Month Last Day'].isna())].groupby(['post month'])['amount'].sum().reset_index()
    non_order_deposit_table = non_order_deposit_table.rename(columns = {'post month':'Order Month', 'amount':'Accrued PnL Related Deposited Amount'})

    Deposit_Decomp_table = pd.merge(
        order_deposit_table,
        non_order_deposit_table,
        left_on = ['Order Month'],
        right_on = ['Order Month'],
        how = 'outer'
    )

    # Sort on Order Month DESC
    Deposit_Decomp_table['Order Month'] = pd.to_datetime(Deposit_Decomp_table['Order Month'], format='%B %Y', errors='coerce')
    Deposit_Decomp_table = Deposit_Decomp_table.sort_values(by='Order Month', ascending=False).reset_index(drop=True)
    Deposit_Decomp_table['Order Month'] = Deposit_Decomp_table['Order Month'].dt.strftime('%B %Y')

    Deposit_Decomp_table = Deposit_Decomp_table.fillna(0)
    Deposit_Decomp_table['Deposited Amount'] = Deposit_Decomp_table.select_dtypes(include='number').sum(axis=1)
    column_totals = Deposit_Decomp_table.select_dtypes(include='number').sum(axis=0)
    grand_total = column_totals.sum()/2
    column_totals['Deposited Amount'] = grand_total
    Deposit_Decomp_table.loc['Grand Total'] = column_totals
    Deposit_Decomp_table = Deposit_Decomp_table.reset_index()

    Deposit_Decomp_table['Order Month'] = np.where(
        Deposit_Decomp_table['Order Month'].isna(),
        'Grand Total',
        Deposit_Decomp_table['Order Month'] 
    )
    Deposit_Decomp_table['Project PnL Related Deposited Amount'] = np.where(
        Deposit_Decomp_table['Order Month'] == 'Grand Total',
        np.nan,
        Deposit_Decomp_table['Project PnL Related Deposited Amount'] 
    )
    Deposit_Decomp_table['Accrued PnL Related Deposited Amount'] = np.where(
        Deposit_Decomp_table['Order Month'] == 'Grand Total',
        np.nan,
        Deposit_Decomp_table['Accrued PnL Related Deposited Amount'] 
    )
    Deposit_Decomp_table['Instruction'] = np.where(
        Deposit_Decomp_table['Order Month'] == deposit_month,
        'Leave for Month-End Journal Booking',
        ''
    )
    Deposit_Decomp_table['Instruction'] = np.where(
        Deposit_Decomp_table['Order Month'] != deposit_month,
        'Use Below for Post Month-End Financials Booking',
        Deposit_Decomp_table['Instruction']
    )
    Deposit_Decomp_table['Instruction'] = np.where(
        Deposit_Decomp_table['Order Month'] == 'Grand Total',
        'Validate with Statement Deposited Amount',
        Deposit_Decomp_table['Instruction']
    )

    Deposit_Decomp_table = Deposit_Decomp_table.drop(columns=['index','Project PnL Related Deposited Amount','Accrued PnL Related Deposited Amount']).reset_index(drop=True)
    Deposit_Decomp_table = Deposit_Decomp_table.applymap(
        lambda x: accounting_format(x) if isinstance(x, (int, float)) else x
    )

    Deposit_Decomp_html = Deposit_Decomp_table.to_html(classes='table table-bordered', index=False, na_rep='')

    style = """
    <style>
        .table-bordered th, .table-bordered td {
            text-align: center;
            vertical-align: middle;
        }
        .table-bordered tr:last-row {
            font-weight: bold;
            background-color: #f2f2f2; /* Add background color for the last row */
        }
    </style>
    """
    title = f"<h5>Processed results for uploaded statement that was deposited on {deposit_date}</h5>"
    Deposit_Decomp_html = style + title + Deposit_Decomp_html

    return Deposit_Decomp_html
