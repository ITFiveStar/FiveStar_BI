"""
Online deployment version of in_order_month_deposit_journal.py
Uses memory processor instead of importing from local files
"""

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
from backend import db

def create_in_order_month_journal_entry(memory_processor):
    """
    Create in-order month journal entry using memory processor
    
    Args:
        memory_processor: MemoryFileProcessor instance containing uploaded files
    
    Returns:
        dict: Response from QuickBooks API
    """
    
    # Import and process the booking data
    from backend.processing.api.api_booking_processing.booking_data.in_order_month_table_online import process_in_order_month_booking
    
    # Process the data using memory processor
    Accrued_Adjusted_PnL, return_principal_to_inventory, PnL_month_str, PnL_month_month, PnL_month_year = process_in_order_month_booking(memory_processor)
    
    # Process PnL data same as original
    pnl_data = Accrued_Adjusted_PnL
    pnl_data['Statement PnL Items'] = pnl_data['Statement PnL Items'].apply(lambda x: 'CouponRedemptionFee' if str(x)[:19] == 'CouponRedemptionFee' else x)
    pnl_data['Statement PnL Items'] = pnl_data['Statement PnL Items'].apply(lambda x: 'FBA Inventory Reimbursement' if str(x)[:27] == 'FBA Inventory Reimbursement' else x)

    # Load QB Account ID mapping from database
    qb_mapping_query = """
        SELECT statement_category, statement_pnl_items, pnl_account_id, bs_account_id 
        FROM qbaccountidmapping
    """
    QB_AccountID_Lookup_Table = pd.read_sql_query(qb_mapping_query, db.engine)
    
    # Account IDs
    accountID_13300_Prepaid_FBA_Inbound_Transportation_Fee = 193
    accountID_14500_Return_Inventory = 1150040062
    accountID_Bank_Deposit = 1150040063

    journal_date_str_month_end = PnL_month_str

    # Fetch tokens and expiration from .env
    env_path = os.path.join(project_root, 'backend', 'processing', 'api', '.env')
    config = dotenv_values(env_path)
    access_token = config.get('ACCESS_TOKEN')
    realm_id = config.get('REALM_ID')

    # Lookup logic for Statement Category and PnL Items
    def get_account_ids(statement_category, pnl_item):
        account_row = QB_AccountID_Lookup_Table[
            (QB_AccountID_Lookup_Table['statement_category'] == statement_category) & 
            (QB_AccountID_Lookup_Table['statement_pnl_items'] == pnl_item)
        ]
        
        if not account_row.empty:
            p_and_l_account_id = account_row['pnl_account_id'].values[0]
            bs_account_id = account_row['bs_account_id'].values[0]
            return p_and_l_account_id, bs_account_id
        else:
            return None, None

    def create_journal_entry(access_token, realm_id):
        # Check if access token is valid
        access_token = check_token_validity()

        base_url = 'https://sandbox-quickbooks.api.intuit.com'
        endpoint = f"{base_url}/v3/company/{realm_id}/journalentry"

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        # Initialize journal lines
        journal_lines = []
        id = 1

        # ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        # Paid Order                                                                                                                                                                                |
        # ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        total_paid = 0

        # project P&L with adjustment
        for idx, row in pnl_data.iterrows():
            if (row['Project PnL Paid'] if pd.notna(row['Project PnL Paid']) else 0) + (row['Adjustment Items - Accrued Adjusted PnL to Adjust'] if pd.notna(row['Adjustment Items - Accrued Adjusted PnL to Adjust']) else 0) != 0:
                p_and_l_account_id, _ = get_account_ids(row['Statement Category'], row['Statement PnL Items'])
                if p_and_l_account_id is not None:
                    project_pnl =  row['Project PnL Paid'] if pd.notna(row['Project PnL Paid']) else 0
                    adjusted_pnl = row['Adjustment Items - Accrued Adjusted PnL to Adjust'] if pd.notna(row['Adjustment Items - Accrued Adjusted PnL to Adjust']) else 0
                    amount = abs(round(project_pnl+adjusted_pnl,2))
                    posting_type = "Credit" if row['Project PnL Paid'] > 0 else "Debit"
                    journal_lines.append({
                        "Id": str(id),
                        "Description": row['Statement PnL Items'] + " - paid and adjusted based on Statements",
                        "Amount": amount,
                        "DetailType": "JournalEntryLineDetail",
                        "JournalEntryLineDetail": {
                            "PostingType": posting_type,
                            "AccountRef": {
                                "value": str(int(p_and_l_account_id))
                            }
                        }
                    })
                    total_paid += round(project_pnl+adjusted_pnl,2)
                    id += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
        
        # add missing items
        for idx, row in pnl_data.iterrows():
            if row['Missing Items - Accrued PnL to Add'] != 0 and pd.notna(row['Missing Items - Accrued PnL to Add']):
                p_and_l_account_id, _ = get_account_ids(row['Statement Category'], row['Statement PnL Items'])
                if p_and_l_account_id is not None:
                    amount = abs(round(row['Missing Items - Accrued PnL to Add'],2))
                    posting_type = "Credit" if row['Missing Items - Accrued PnL to Add'] > 0 else "Debit"
                    journal_lines.append({
                        "Id": str(id),
                        "Description": row['Statement PnL Items'] + " - paid and adjusted based on Statements",
                        "Amount": amount,
                        "DetailType": "JournalEntryLineDetail",
                        "JournalEntryLineDetail": {
                            "PostingType": posting_type,
                            "AccountRef": {
                                "value": str(int(p_and_l_account_id))
                            }
                        }
                    })
                    total_paid += round(row['Missing Items - Accrued PnL to Add'],2)
                    id += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
        
        # FBA Inbound Transportation Fee difference from Statmenet to Prepaid Expenses (Assets) account
        FBA_Inbound_to_Asset_amount = pnl_data.loc[pnl_data['Statement PnL Items'] == 'FBA Inbound Transportation Fee', 'FBA Inbound Transportation Fee Diff to Balance Sheet Asset'].values[0]
        if pd.notna(FBA_Inbound_to_Asset_amount) and FBA_Inbound_to_Asset_amount !=0:
            posting_type_BS = "Debit" if FBA_Inbound_to_Asset_amount > 0 else "Credit"
            amount = abs(round(FBA_Inbound_to_Asset_amount,2))
            journal_lines.append({
                "Id": str(id),
                "Description": " FBA Inbound Transportation Fee - difference from Statements to 13300 - Prepaid FBA Inbound Transportation Fee",
                "Amount": amount,
                "DetailType": "JournalEntryLineDetail",
                "JournalEntryLineDetail": {
                    "PostingType": posting_type_BS,
                    "AccountRef": {
                        "value": str(accountID_13300_Prepaid_FBA_Inbound_Transportation_Fee)
                    }
                }
            })
            total_paid += -round(FBA_Inbound_to_Asset_amount,2)
            id += 1

        # Returns - non principal price
        for idx, row in pnl_data.iterrows():
            if row['Return Items - Accrued Adjusted PnL to Adjust'] != 0 and pd.notna(row['Return Items - Accrued Adjusted PnL to Adjust']):
                p_and_l_account_id, _ = get_account_ids(row['Statement Category'], row['Statement PnL Items'])
                if p_and_l_account_id is not None:
                    amount = abs(round(row['Return Items - Accrued Adjusted PnL to Adjust'],2))
                    posting_type = "Credit" if row['Return Items - Accrued Adjusted PnL to Adjust'] > 0 else "Debit"
                    journal_lines.append({
                        "Id": str(id),
                        "Description": row['Statement PnL Items'] + " - Return Related",
                        "Amount": amount,
                        "DetailType": "JournalEntryLineDetail",
                        "JournalEntryLineDetail": {
                            "PostingType": posting_type,
                            "AccountRef": {
                                "value": str(int(p_and_l_account_id))
                            }
                        }
                    })
                    total_paid += round(row['Return Items - Accrued Adjusted PnL to Adjust'],2)
                    id += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
        
        # Returns - principal price to Return Inventory Account
        if pd.notna(return_principal_to_inventory):
            posting_type_BS = "Debit"
            amount = -round(return_principal_to_inventory,2)
            journal_lines.append({
                "Id": str(id),
                "Description": "Return Principal to 14500 - Return Inventory",
                "Amount": amount,
                "DetailType": "JournalEntryLineDetail",
                "JournalEntryLineDetail": {
                    "PostingType": posting_type,
                    "AccountRef": {
                        "value": str(accountID_14500_Return_Inventory)
                    }
                }
            })
            total_paid += round(return_principal_to_inventory,2)
            id += 1

        # Book the In-Order Month Statement Deposit line
        journal_lines.append({
            "Id": str(id),
            "Description": "In-Order Month Statement Bank Deposit",
            "Amount": abs(total_paid),
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": "Debit" if total_paid > 0 else "Credit",
                "AccountRef": {
                    "value": str(accountID_Bank_Deposit)
                }
            }
        })
        id += 1

    # ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    # Unpaid Order                                                                                                                                                                              |
    # ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        # Process Project PnL Unpaid
        for idx, row in pnl_data.iterrows():
            if row['Project PnL Unpaid'] != 0 and pd.notna(row['Project PnL Unpaid']):
                p_and_l_account_id, bs_account_id = get_account_ids(row['Statement Category'], row['Statement PnL Items'])
                if p_and_l_account_id is not None and bs_account_id is not None:
                    amount = abs(row['Project PnL Unpaid'])

                    # P&L Account booking
                    posting_type = "Credit" if row['Project PnL Unpaid'] > 0 else "Debit"
                    journal_lines.append({
                        "Id": str(id),
                        "Description": row['Statement PnL Items'] + " - unpaid estimate",
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
                    posting_type_BS = "Debit" if row['Project PnL Unpaid'] > 0 else "Credit"
                    entity_type_BS = "Customer" if row['Project PnL Unpaid'] > 0 else "Vendor"
                    entity_value_BS = "58" if row['Project PnL Unpaid'] > 0 else "59"
                    AR_AP_type = " - AR" if row['Project PnL Unpaid'] > 0 else " - AP"
                    journal_lines.append({
                        "Id": str(id),
                        "Description": row['Statement PnL Items'] + AR_AP_type,
                        "Amount": amount,
                        "DetailType": "JournalEntryLineDetail",
                        "JournalEntryLineDetail": {
                            "PostingType": posting_type_BS,
                            "AccountRef": {
                                "value": str(int(bs_account_id))
                            },
                            "Entity": {
                                "Type": entity_type_BS, 
                                "EntityRef": {
                                    "value": entity_value_BS
                                }
                            }
                        }
                    })
                    id += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")

        # Create the journal entry
        data = {
            "TxnDate": journal_date_str_month_end, 
            "Line": journal_lines,
            "DocNumber": 'Month End ' + PnL_month_month[:3] + PnL_month_year[-2:]
        }

        # Make the POST request to create the journal entry
        response = requests.post(endpoint, headers=headers, json=data)

        if response.status_code == 200:
            return {"success": True, "message": "Journal entry created successfully.", "data": response.json()}
        else:
            return {"success": False, "error": f"Error: {response.status_code}", "details": response.text}

    # Call the function to create a journal entry
    return create_journal_entry(access_token, realm_id)
