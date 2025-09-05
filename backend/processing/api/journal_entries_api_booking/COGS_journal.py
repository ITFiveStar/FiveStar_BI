import os
import sys
current_directory = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_directory, os.pardir, os.pardir, os.pardir, os.pardir))
sys.path.append(project_root)

import requests
from dotenv import dotenv_values
from backend.processing.api.refresh_tokens import check_token_validity
import json

import pandas as pd
from datetime import datetime

QB_AccountID_Lookup_Table = pd.read_csv(os.path.join(project_root, 'backend', 'processing', 'api','api_booking_processing','all_time_info', 'QB Account ID Mapping.csv'))
COGS_statement_category = 'COGS'
COGS_statement_pnl_item = 'COGS - PC and Hardware'

# Fetch tokens and expiration from .env
env_path = os.path.join(project_root, 'backend', 'processing', 'api', '.env')
config = dotenv_values(env_path)
access_token = config.get('ACCESS_TOKEN')
realm_id = config.get('REALM_ID')

# Lookup logic for Statement Category and PnL Items
def get_account_ids(statement_category, pnl_item):
    account_row = QB_AccountID_Lookup_Table[
        (QB_AccountID_Lookup_Table['Statement Category'] == statement_category) & 
        (QB_AccountID_Lookup_Table['Statement PnL Items'] == pnl_item)
    ]
    
    if not account_row.empty:
        p_and_l_account_id = account_row['P&L Account ID'].values[0]
        bs_account_id = account_row['BS Account ID'].values[0]
        return p_and_l_account_id, bs_account_id
    else:
        return None, None

def create_COGS_journal_entry(access_token, realm_id, COGS_amount, booking_date_start, booking_date_end):
    # Check if access token is valid
    access_token = check_token_validity()

    base_url = 'https://sandbox-quickbooks.api.intuit.com'
    endpoint = f"{base_url}/v3/company/{realm_id}/journalentry"

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        # Add this to prevent gzip encoding in the response
        'Accept-Encoding': 'identity'
    }

    # Initialize journal lines
    journal_lines = []
    id = 1

    p_and_l_account_id, bs_account_id = get_account_ids(COGS_statement_category, COGS_statement_pnl_item)

    if p_and_l_account_id is not None and bs_account_id is not None:
        amount = COGS_amount

        # P&L Account booking
        posting_type = "Debit" 
        journal_lines.append({
            "Id": str(id),
            "Description": booking_date_start + " to " + booking_date_end + "COGS - PC and Hardware",
            "Amount": amount,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": posting_type,
                "AccountRef": {
                    "value": str(int(p_and_l_account_id))
                }
            }
        })
        id += 1

        # BS Account booking
        posting_type_BS =  "Credit"
        journal_lines.append({
            "Id": str(id),
            "Description": booking_date_start + " to " + booking_date_end + "Outbound Inventory",
            "Amount": amount,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": posting_type_BS,
                "AccountRef": {
                    "value": str(int(bs_account_id))
                }
            }
        })
    else:
        print(f"{COGS_statement_pnl_item} cannot be categorized to QB account. Check QB Account ID Mapping.csv")

    # Create the journal entry
    data = {
        "TxnDate": booking_date_end, 
        "Line": journal_lines,
        "DocNumber": booking_date_start[-5:] + "to" + booking_date_end + "COGS"
    }

    # Make the POST request to create the journal entry with error handling
    try:
        # First attempt with standard settings
        response = requests.post(endpoint, headers=headers, json=data)
        response.raise_for_status()  # Raise an exception for 4XX/5XX responses
    except requests.exceptions.ContentDecodingError:
        # If we get a content decoding error, try with a session that disables content encoding
        print("Content decoding error encountered, retrying with different settings...")
        session = requests.Session()
        session.headers.update(headers)
        # Disable automatic content decompression
        session.mount('https://', requests.adapters.HTTPAdapter())
        response = session.post(endpoint, json=data)
    except Exception as e:
        print(f"Error making request to QuickBooks API: {str(e)}")
        raise

    if response.status_code == 200:
        print("Journal entry created successfully.")
        print(response.json())
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        raise Exception(f"Failed to create journal entry: {response.text}")

# Call the function to create a journal entry
# create_COGS_journal_entry(access_token, realm_id, 20, '2024-01-01', '2024-01-31')

