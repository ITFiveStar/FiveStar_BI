
import os
import sys
current_directory = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
project_root = os.path.abspath(os.path.join(current_directory, os.pardir))
sys.path.append(project_root)

import pandas as pd
import numpy as np
from backend.processing.functions.input_files import combine_files_same_folder_differentiation
from backend.processing.functions.date_processing import confirm_utc, add_new_utc_to_pst_pdt_column

# read all files
folder_path = os.path.join(project_root, "z. Input - All Orders")
all_orders = combine_files_same_folder_differentiation(folder_path,'all orders')

folder_path = os.path.join(project_root, "z. Input - Statements")
statements = combine_files_same_folder_differentiation(folder_path,'statements')

# all_orders processing: successful orders only
all_orders = all_orders[
    (all_orders['item-status'] != 'Cancelled') &
    (all_orders['quantity'] != 0)
    ]

# all_orders processing: dates
all_orders['purchase-date-UTC'] = confirm_utc(all_orders, 'purchase-date')
all_orders['purchase-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(all_orders, 'purchase-date-UTC')

all_orders = all_orders[['amazon-order-id', 'purchase-date-PST-PDT', 'sku',  'quantity', 'item-price']]
all_orders = all_orders.rename(columns={'amazon-order-id': 'sales_record_id', 'purchase-date-PST-PDT': 'sales_date', 'sku': 'SKU', 'quantity': 'quantity_sold', 'item-price': 'total_price'})
all_orders['customer_name'] = 'Amazon'

all_orders = pd.pivot_table(
    all_orders, 
    values=['quantity_sold', 'total_price'], 
    index=['sales_record_id', 'sales_date', 'SKU', 'customer_name'],
    aggfunc='sum',
    fill_value=0
    ).reset_index()


all_orders['unit_price'] = all_orders['total_price'] / all_orders['quantity_sold']

# statements returns
statements_returns = statements[
    (statements['transaction-type'] == 'Refund') &
    (statements['amount-type'] == 'ItemPrice') &
    (statements['amount-description'] == 'Principal')
    ]
statements_returns = statements_returns[['order-id', 'sku', 'amount']]
statements_returns = pd.pivot_table(
    statements_returns, 
    values='amount', 
    index=['order-id', 'sku'],
    aggfunc='sum',
    fill_value=0
    ).reset_index()

statements_returns = pd.merge(
    statements_returns, 
    all_orders, 
    left_on=['order-id','sku'], 
    right_on=['sales_record_id','SKU'],
    how='left'
    )

statements_returns['return_quantity'] = statements_returns['amount'] * -1 / statements_returns['unit_price']
statements_returns = statements_returns[
    (statements_returns['return_quantity'] > 0.5)
    ]
statements_returns['return_quantity'] = np.ceil(statements_returns['return_quantity'])
statements_returns['unit_price'] = statements_returns['amount'] * -1 / statements_returns['return_quantity']

statements_returns['supplier_name'] = 'Amazon Returns'
statements_returns['return_currency'] = 'USD'
statements_returns['target_currency'] = 'USD'
statements_returns['fx_rate'] = 1

statements_returns = statements_returns[['sales_record_id', 'SKU', 'sales_date',  'return_quantity', 'unit_price', 'supplier_name', 'return_currency', 'target_currency', 'fx_rate']]
statements_returns = statements_returns.rename(columns={'sales_record_id': 'return_order_id', 'sales_date': 'return_date', 'unit_price': 'return_unit_price'})

# save to csv
statements_returns.to_csv('returns_records.csv', index=False)





