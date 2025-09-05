
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

env_path = os.path.join(project_root, 'backend', 'processing', 'api', '.env')
config = dotenv_values(env_path)

# Fetch tokens and expiration from .env
access_token = config.get('ACCESS_TOKEN')
refresh_token = config.get('REFRESH_TOKEN')
realm_id = config.get('REALM_ID')
token_expiration = float(config.get('TOKEN_EXPIRATION'))

def make_api_call(access_token, realm_id):
    # Check if access token is valid
    access_token = check_token_validity()

    base_url = 'https://sandbox-quickbooks.api.intuit.com'
    endpoint = f"{base_url}/v3/company/{realm_id}/query"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }

    accounts = []
    start_position = 1
    max_results = 100  # Set the maximum results per request

    while True:
        # Construct the query with STARTPOSITION and MAXRESULTS
        query = f"SELECT * FROM Account STARTPOSITION {start_position} MAXRESULTS {max_results}"
        
        response = requests.get(endpoint, headers=headers, params={'query': query})

        if response.status_code == 200:
            data = response.json()
            fetched_accounts = data.get('QueryResponse', {}).get('Account', [])

            if not fetched_accounts:
                # No more accounts to fetch
                break

            accounts.extend(fetched_accounts)

            # Update start_position for the next request
            start_position += max_results

            # If fewer accounts were fetched than max_results, we've reached the end
            if len(fetched_accounts) < max_results:
                break
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            break

    # Remove duplicates if any
    unique_accounts = {account['Id']: account for account in accounts}.values()
    
    print(f"Total unique accounts retrieved: {len(unique_accounts)}")
    # print(json.dumps(list(unique_accounts), indent=4))
    return list(unique_accounts)

# Run the API call to query accounts
result = make_api_call(access_token, realm_id)
# Create a DataFrame from the account data
df = pd.DataFrame(result)

# Normalize the CurrencyRef column for better readability
df['Currency'] = df['CurrencyRef'].apply(lambda x: x['name'])
df['CurrencyValue'] = df['CurrencyRef'].apply(lambda x: x['value'])
df = df.drop(columns=['CurrencyRef'])

# Normalize the MetaData column
df['CreateTime'] = df['MetaData'].apply(lambda x: x['CreateTime'])
df['LastUpdatedTime'] = df['MetaData'].apply(lambda x: x['LastUpdatedTime'])
df = df.drop(columns=['MetaData'])

df.to_csv('QB Account List.csv', index=False)