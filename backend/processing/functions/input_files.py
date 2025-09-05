
import os
import sys
current_directory = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_directory, os.pardir))
sys.path.append(project_root)

import pandas as pd

def combine_files_same_folder_differentiation(folder_path,file):
    if file == 'all orders':
        data_list = []
        for file_name in os.listdir(folder_path):
            if 'order' in file_name.lower(): 
                file_path = os.path.join(folder_path, file_name)
                df = pd.read_csv(file_path)
                required_columns = ['amazon-order-id', 'purchase-date', 'order-status', 'fulfillment-channel', 
                                    'sales-channel', 'sku', 'item-status', 'quantity', 'currency', 
                                    'item-price', 'item-tax', 'shipping-price', 'shipping-tax', 
                                    'gift-wrap-price', 'gift-wrap-tax', 'item-promotion-discount', 
                                    'ship-promotion-discount']
                # If required columns does not exist, then initialize it and have the value to be NaN
                for column in required_columns:
                    if column not in df.columns:
                        df[column] = pd.NA
                # Create dataframe based on the order of required columns
                df = df[required_columns]
                data_list.append(df)
            else:
                continue
    elif file == 'sku economics':
        data_list = []
        for file_name in os.listdir(folder_path):
            if 'economic' in file_name.lower():
                file_path = os.path.join(folder_path, file_name)
                df = pd.read_csv(file_path)
                required_columns = ['Amazon store', 'Start date', 'End date', 'MSKU', 'Currency code', 
                                'FBA fulfilment fees total', 'Sponsored Products charge total', 
                                'Monthly inventory storage fee total', 'Inbound transportation charge total']
                # If required columns does not exist, then initialize it and have the value to be NaN
                for column in required_columns:
                    if column not in df.columns:
                        df[column] = pd.NA
                # Create dataframe based on the order of required columns
                df = df[required_columns]
                data_list.append(df)
            else:
                continue
    elif file == 'statements':
        data_list = []
        for file_name in os.listdir(folder_path):
            if 'statement' in file_name.lower():
                file_path = os.path.join(folder_path, file_name)
                df = pd.read_csv(file_path, delimiter='\t')
                required_columns = ['settlement-id', 'settlement-start-date', 'settlement-end-date', 'deposit-date', 'total-amount', 'currency', 
                                'transaction-type', 'order-id', 'marketplace-name', 
                                'amount-type', 'amount-description', 'amount', 'posted-date-time',
                                'sku', 'quantity-purchased']
                # If required columns does not exist, then initialize it and have the value to be NaN
                for column in required_columns:
                    if column not in df.columns:
                        df[column] = pd.NA
                # Create dataframe based on the order of required columns
                df = df[required_columns]
                data_list.append(df)
            else:
                continue
    return_dataset = pd.concat(data_list, ignore_index=True)
    return return_dataset