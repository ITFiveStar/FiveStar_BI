
import os
import sys
current_directory = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
project_root = os.path.abspath(os.path.join(current_directory, os.pardir))
sys.path.append(project_root)

import pandas as pd
from backend.processing.functions.input_files import combine_files_same_folder_differentiation
from backend.processing.functions.date_processing import confirm_utc, add_new_utc_to_pst_pdt_column

# read all files
folder_path = os.path.join(project_root, "z. Input - All Orders")
all_orders = combine_files_same_folder_differentiation(folder_path,'all orders')

# all_orders processing: successful orders only
all_orders = all_orders[
    (all_orders['item-status'] != 'Cancelled') &
    (all_orders['quantity'] != 0)
    ]

# all_orders processing: dates
all_orders['purchase-date-UTC'] = confirm_utc(all_orders, 'purchase-date')
all_orders['purchase-date-PST-PDT'] = add_new_utc_to_pst_pdt_column(all_orders, 'purchase-date-UTC')

# only keep sales_records_template required columns
required_columns = ['amazon-order-id', 'purchase-date-PST-PDT', 'sku',  'quantity']
all_orders = all_orders[required_columns]
all_orders = all_orders.rename(columns={'amazon-order-id': 'sales_record_id', 'purchase-date-PST-PDT': 'sales_date', 'quantity': 'quantity_sold'})
all_orders['customer_name'] = 'Amazon'

# combine all_orders_nonAmazon and all_orders
sales_records = all_orders

sales_records = pd.pivot_table(
    sales_records, 
    values='quantity_sold', 
    index=['sales_record_id', 'sales_date', 'sku', 'customer_name'],
    aggfunc='sum',
    fill_value=0
    ).reset_index()
sales_records = sales_records.loc[:, ['sales_record_id', 'sales_date', 'sku','quantity_sold', 'customer_name']]

# save to csv
sales_records.to_csv('sales_records.csv', index=False)


