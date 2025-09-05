"""
Online deployment version of out_of_order_month_deposit_journal.py
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

def create_out_of_order_month_journal_entry(memory_processor):
    """
    Create out-of-order month journal entry using memory processor
    
    Args:
        memory_processor: MemoryFileProcessor instance containing uploaded files
    
    Returns:
        dict: Response from QuickBooks API
    """
    
    # Import and process the booking data
    from backend.processing.api.api_booking_processing.booking_data.out_of_order_month_table_online import process_out_of_order_month_booking
    
    # Process the data using memory processor
    Accrued_Adjusted_PnL, return_principal_to_inventory, PnL_month_str, process_statement_deposit_date = process_out_of_order_month_booking(memory_processor)
    
    # Process PnL data same as original
    pnl_data = Accrued_Adjusted_PnL
    pnl_data['Statement PnL Items'] = pnl_data['Statement PnL Items'].apply(lambda x: 'CouponRedemptionFee' if str(x)[:19] == 'CouponRedemptionFee' else x)
    pnl_data['Statement PnL Items'] = pnl_data['Statement PnL Items'].apply(lambda x: 'FBA Inventory Reimbursement' if str(x)[:27] == 'FBA Inventory Reimbursement' else x)

    # Load QB Account ID mapping from database
    qb_mapping_query = """
        SELECT statement_category, statement_pnl_items, pnl_account_name, pnl_account_id, bs_account_name, bs_account_id 
        FROM qbaccountidmapping
    """
    QB_AccountID_Lookup_Table = pd.read_sql_query(qb_mapping_query, db.engine)
    
    # Account IDs
    accountID_13300_Prepaid_FBA_Inbound_Transportation_Fee = 193
    accountID_14500_Return_Inventory = 1150040062
    accountID_21351_AP_Return_Sales_Principal_Reversal = 1150040036
    accountID_Bank_Deposit = 1150040063

    journal_date_str_month_end = PnL_month_str
    journal_date_str_close = process_statement_deposit_date

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
        
    def get_account_name(statement_category, pnl_item):
        account_row = QB_AccountID_Lookup_Table[
            (QB_AccountID_Lookup_Table['statement_category'] == statement_category) & 
            (QB_AccountID_Lookup_Table['statement_pnl_items'] == pnl_item)
        ]
        
        if not account_row.empty:
            bs_account_name = account_row['bs_account_name'].values[0]
            return bs_account_name
        else:
            return None

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
        journal_lines_close = []
        id_close = 1

        journal_lines_new_adj = []
        id_new_adj = 1

        # ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        # Paid Order after Order Month                                                                                                                                                                                |
        # ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        total_paid = 0

        for idx, row in pnl_data.iterrows():
            p_and_l_account_id, bs_account_id = get_account_ids(row['Statement Category'], row['Statement PnL Items'])
            bs_account_name = get_account_name(row['Statement Category'], row['Statement PnL Items'])
            # close past AR AP
            if (row['Project PnL Paid after Order Month End: Past Unpaid Estimate'] if pd.notna(row['Project PnL Paid after Order Month End: Past Unpaid Estimate']) else 0)  != 0:
                if bs_account_id is not None:
                    project_pnl =  row['Project PnL Paid after Order Month End: Past Unpaid Estimate'] if pd.notna(row['Project PnL Paid after Order Month End: Past Unpaid Estimate']) else 0
                    amount_to_close_AR_AP = abs(round(project_pnl,2))
                    posting_type_BS = "Credit" if row['Project PnL Paid after Order Month End: Past Unpaid Estimate'] > 0 else "Debit"
                    entity_type_BS = "Customer" if row['Project PnL Paid after Order Month End: Past Unpaid Estimate'] > 0 else "Vendor"
                    entity_value_BS = "58" if row['Project PnL Paid after Order Month End: Past Unpaid Estimate'] > 0 else "59"
                    AR_AP_type = " - close past AR" if row['Project PnL Paid after Order Month End: Past Unpaid Estimate'] > 0 else " - close past AP"
                    journal_lines_close.append({
                        "Id": str(id_close),
                        "Description": row['Statement PnL Items'] + AR_AP_type,
                        "Amount": amount_to_close_AR_AP,
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
                    total_paid += round(project_pnl,2)
                    id_close += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
            
            # add adj AR/AP and P&L at month-end date, then close the adj AR/AP at statement deposit date
            if (row['Adjustment Items - Accrued Adjusted PnL to Adjust'] if pd.notna(row['Adjustment Items - Accrued Adjusted PnL to Adjust']) else 0) != 0:
                # add adj AR/AP
                if bs_account_id is not None:
                    adjusted_pnl = row['Adjustment Items - Accrued Adjusted PnL to Adjust'] if pd.notna(row['Adjustment Items - Accrued Adjusted PnL to Adjust']) else 0
                    amount_to_adjust_pnl = abs(round(adjusted_pnl,2))
                    posting_type_BS = "Debit" if row['Adjustment Items - Accrued Adjusted PnL to Adjust'] > 0 else "Credit"
                    entity_type_BS = "Customer" if " AR " in bs_account_name else "Vendor"
                    entity_value_BS = "58" if " AR " in bs_account_name else "59"
                    AR_AP_type =  " - adjust AR/AP based on out-of-month statement"
                    journal_lines_new_adj.append({
                        "Id": str(id_new_adj),
                        "Description": row['Statement PnL Items'] + AR_AP_type,
                        "Amount": amount_to_adjust_pnl,
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
                    id_new_adj += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
                # add adj P&L
                if p_and_l_account_id is not None:
                    adjusted_pnl = row['Adjustment Items - Accrued Adjusted PnL to Adjust'] if pd.notna(row['Adjustment Items - Accrued Adjusted PnL to Adjust']) else 0
                    amount_to_adjust_pnl = abs(round(adjusted_pnl,2))
                    posting_type = "Credit" if row['Adjustment Items - Accrued Adjusted PnL to Adjust'] > 0 else "Debit"
                    journal_lines_new_adj.append({
                        "Id": str(id_new_adj),
                        "Description": row['Statement PnL Items'] + " - adjustment based on out-of-month statement",
                        "Amount": amount_to_adjust_pnl,
                        "DetailType": "JournalEntryLineDetail",
                        "JournalEntryLineDetail": {
                            "PostingType": posting_type,
                            "AccountRef": {
                                "value": str(int(p_and_l_account_id))
                            }
                        }
                    })
                    id_new_adj += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
                # close the adj AR/AP at statement deposit date
                if bs_account_id is not None:
                    adjusted_pnl = row['Adjustment Items - Accrued Adjusted PnL to Adjust'] if pd.notna(row['Adjustment Items - Accrued Adjusted PnL to Adjust']) else 0
                    amount_to_adjust_pnl = abs(round(adjusted_pnl,2))
                    posting_type_BS = "Credit" if row['Adjustment Items - Accrued Adjusted PnL to Adjust'] > 0 else "Debit"
                    entity_type_BS = "Customer" if " AR " in bs_account_name else "Vendor"
                    entity_value_BS = "58" if " AR " in bs_account_name else "59"
                    AR_AP_type =  " - close AR/AP adjustment"
                    journal_lines_close.append({
                        "Id": str(id_close),
                        "Description": row['Statement PnL Items'] + AR_AP_type,
                        "Amount": amount_to_adjust_pnl,
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
                    total_paid += round(adjusted_pnl,2)
                    id_close += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")

            # add missing items
            if (row['Missing Items - Accrued PnL to Add'] if pd.notna(row['Missing Items - Accrued PnL to Add']) else 0) != 0:
                # add missing items AR/AP
                if bs_account_id is not None:
                    missing_pnl = row['Missing Items - Accrued PnL to Add'] if pd.notna(row['Missing Items - Accrued PnL to Add']) else 0
                    amount_to_add_for_missing_pnl = abs(round(missing_pnl,2))
                    posting_type_BS = "Debit" if row['Missing Items - Accrued PnL to Add'] > 0 else "Credit"
                    entity_type_BS = "Customer" if " AR " in bs_account_name else "Vendor"
                    entity_value_BS = "58" if " AR " in bs_account_name else "59"
                    AR_AP_type =  " - add missing items based on out-of-month statement"
                    journal_lines_new_adj.append({
                        "Id": str(id_new_adj),
                        "Description": row['Statement PnL Items'] + AR_AP_type,
                        "Amount": amount_to_add_for_missing_pnl,
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
                    id_new_adj += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
                # add missing items P&L
                if p_and_l_account_id is not None:
                    missing_pnl = row['Missing Items - Accrued PnL to Add'] if pd.notna(row['Missing Items - Accrued PnL to Add']) else 0
                    amount_to_add_for_missing_pnl = abs(round(missing_pnl,2))
                    posting_type = "Credit" if row['Missing Items - Accrued PnL to Add'] > 0 else "Debit"
                    journal_lines_new_adj.append({
                        "Id": str(id_new_adj),
                        "Description": row['Statement PnL Items'] + " - add missing items based on out-of-month statement",
                        "Amount": amount_to_add_for_missing_pnl,
                        "DetailType": "JournalEntryLineDetail",
                        "JournalEntryLineDetail": {
                            "PostingType": posting_type,
                            "AccountRef": {
                                "value": str(int(p_and_l_account_id))
                            }
                        }
                    })
                    id_new_adj += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
                # close the missing items AR/AP at statement deposit date
                if bs_account_id is not None:
                    missing_pnl = row['Missing Items - Accrued PnL to Add'] if pd.notna(row['Missing Items - Accrued PnL to Add']) else 0
                    amount_to_add_for_missing_pnl = abs(round(missing_pnl,2))
                    posting_type_BS = "Credit" if row['Missing Items - Accrued PnL to Add'] > 0 else "Debit"
                    entity_type_BS = "Customer" if " AR " in bs_account_name else "Vendor"
                    entity_value_BS = "58" if " AR " in bs_account_name else "59"
                    AR_AP_type =  " - close missing items AR/AP" 
                    journal_lines_close.append({
                        "Id": str(id_close),
                        "Description": row['Statement PnL Items'] + AR_AP_type,
                        "Amount": amount_to_add_for_missing_pnl,
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
                    total_paid += round(missing_pnl,2)
                    id_close += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
            
            # Returns - non principal price
            if (row['Return Items - Accrued Adjusted PnL to Adjust'] if pd.notna(row['Return Items - Accrued Adjusted PnL to Adjust']) else 0) != 0:
                # add non principal price return AR/AP
                if bs_account_id is not None:
                    return_non_principal_price = row['Return Items - Accrued Adjusted PnL to Adjust'] if pd.notna(row['Return Items - Accrued Adjusted PnL to Adjust']) else 0
                    amount_to_add_for_non_principal_return_pnl = abs(round(return_non_principal_price,2))
                    posting_type_BS = "Debit" if row['Return Items - Accrued Adjusted PnL to Adjust'] > 0 else "Credit"
                    entity_type_BS = "Customer" if " AR " in bs_account_name else "Vendor"
                    entity_value_BS = "58" if " AR " in bs_account_name else "59"
                    AR_AP_type =  " - add AR/AP for non principal price return" 
                    journal_lines_new_adj.append({
                        "Id": str(id_new_adj),
                        "Description": row['Statement PnL Items'] + AR_AP_type,
                        "Amount": amount_to_add_for_non_principal_return_pnl,
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
                    id_new_adj += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
                # add non principal price return P&L
                if p_and_l_account_id is not None:
                    return_non_principal_price = row['Return Items - Accrued Adjusted PnL to Adjust'] if pd.notna(row['Return Items - Accrued Adjusted PnL to Adjust']) else 0
                    amount_to_add_for_non_principal_return_pnl = abs(round(return_non_principal_price,2))
                    posting_type = "Credit" if row['Return Items - Accrued Adjusted PnL to Adjust'] > 0 else "Debit"
                    journal_lines_new_adj.append({
                        "Id": str(id_new_adj),
                        "Description": row['Statement PnL Items'] + " - add non principal price return",
                        "Amount": amount_to_add_for_non_principal_return_pnl,
                        "DetailType": "JournalEntryLineDetail",
                        "JournalEntryLineDetail": {
                            "PostingType": posting_type,
                            "AccountRef": {
                                "value": str(int(p_and_l_account_id))
                            }
                        }
                    })
                    id_new_adj += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
                # close the non principal price return AR/AP at statement deposit date
                if bs_account_id is not None:
                    return_non_principal_price = row['Return Items - Accrued Adjusted PnL to Adjust'] if pd.notna(row['Return Items - Accrued Adjusted PnL to Adjust']) else 0
                    amount_to_add_for_non_principal_return_pnl = abs(round(return_non_principal_price,2))
                    posting_type_BS = "Credit" if row['Return Items - Accrued Adjusted PnL to Adjust'] > 0 else "Debit"
                    entity_type_BS = "Customer" if " AR " in bs_account_name else "Vendor"
                    entity_value_BS = "58" if " AR " in bs_account_name else "59"
                    AR_AP_type =  " - close AR/AP for non principal price return" 
                    journal_lines_close.append({
                        "Id": str(id_close),
                        "Description": row['Statement PnL Items'] + AR_AP_type,
                        "Amount": amount_to_add_for_non_principal_return_pnl,
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
                    total_paid += round(return_non_principal_price,2)
                    id_close += 1
                else:
                    print(f"{row['Statement PnL Items']} cannot be categorized to QB account. Check QBAccountIDMapping table in database")
        
        # FBA Inbound Transportation Fee difference from Statmenet to Prepaid Expenses (Assets) account
        FBA_Inbound_to_Asset_amount = pnl_data.loc[pnl_data['Statement PnL Items'] == 'FBA Inbound Transportation Fee', 'FBA Inbound Transportation Fee Diff to Balance Sheet Asset'].values[0]
        if pd.notna(FBA_Inbound_to_Asset_amount) and FBA_Inbound_to_Asset_amount !=0:
            posting_type_BS = "Debit" if FBA_Inbound_to_Asset_amount > 0 else "Credit"
            amount = abs(round(FBA_Inbound_to_Asset_amount,2))
            journal_lines_close.append({
                "Id": str(id_close),
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
            id_close += 1     
        
        # Returns - principal price to Return Inventory Account
        if pd.notna(return_principal_to_inventory) and return_principal_to_inventory !=0:
            # add inventory adj
            posting_type_BS = "Debit"
            amount = -round(return_principal_to_inventory,2)
            journal_lines_new_adj.append({
                "Id": str(id_new_adj),
                "Description": "Return Principal to 14500 - Return Inventory",
                "Amount": amount,
                "DetailType": "JournalEntryLineDetail",
                "JournalEntryLineDetail": {
                    "PostingType": posting_type_BS,
                    "AccountRef": {
                        "value": str(accountID_14500_Return_Inventory)
                    }
                }
            })
            id_new_adj += 1
            # add inventory adj AP
            posting_type_BS = "Credit"
            journal_lines_new_adj.append({
                "Id": str(id_new_adj),
                "Description": "Return Principal AP",
                "Amount": amount,
                "DetailType": "JournalEntryLineDetail",
                "JournalEntryLineDetail": {
                    "PostingType": posting_type_BS,
                    "AccountRef": {
                        "value": str(accountID_21351_AP_Return_Sales_Principal_Reversal)
                    },
                    "Entity": {
                        "Type": "Vendor", 
                        "EntityRef": {
                            "value": "59"
                        }
                    }
                }
            })
            id_new_adj += 1
            # close inventory adj AP at statement deposit date
            posting_type_BS = "Debit"
            journal_lines_close.append({
                "Id": str(id_close),
                "Description": "Close Return Principal AP",
                "Amount": amount,
                "DetailType": "JournalEntryLineDetail",
                "JournalEntryLineDetail": {
                    "PostingType": posting_type_BS,
                    "AccountRef": {
                        "value": str(accountID_21351_AP_Return_Sales_Principal_Reversal)
                    },
                    "Entity": {
                        "Type": "Vendor", 
                        "EntityRef": {
                            "value": "59"
                        }
                    }
                }
            })
            total_paid += round(return_principal_to_inventory,2)
            id_close += 1   

        # Book the Out-of-Order Month Statement Deposit line
        journal_lines_close.append({
            "Id": str(id_close),
            "Description": "Out-of-Order Month Statement Bank Deposit",
            "Amount": abs(total_paid),
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": "Debit" if total_paid > 0 else "Credit",
                "AccountRef": {
                    "value": str(accountID_Bank_Deposit)
                }
            }
        })

        # Create the journal entry
        data_month_end_adj = {
            "TxnDate": journal_date_str_month_end, 
            "Line": journal_lines_new_adj,
            "DocNumber": 'Adj from ' + journal_date_str_close
        }
        data_after_month_end_close = {
            "TxnDate": journal_date_str_close, 
            "Line": journal_lines_close,
            "DocNumber": 'Close ' + journal_date_str_month_end
        }

        # Make the POST request to create the journal entry
        response1 = requests.post(endpoint, headers=headers, json=data_month_end_adj)
        response2 = requests.post(endpoint, headers=headers, json=data_after_month_end_close)

        results = []
        if response1.status_code == 200:
            results.append({"type": "month_end_adjustment", "success": True, "data": response1.json()})
        else:
            results.append({"type": "month_end_adjustment", "success": False, "error": f"Error: {response1.status_code}", "details": response1.text})
        
        if response2.status_code == 200:
            results.append({"type": "after_month_end_close", "success": True, "data": response2.json()})
        else:
            results.append({"type": "after_month_end_close", "success": False, "error": f"Error: {response2.status_code}", "details": response2.text})

        # Check if all succeeded
        all_success = all(result["success"] for result in results)
        
        return {
            "success": all_success, 
            "message": "All journal entries created successfully" if all_success else "Some journal entries failed",
            "results": results
        }

    # Call the function to create journal entries
    return create_journal_entry(access_token, realm_id)
