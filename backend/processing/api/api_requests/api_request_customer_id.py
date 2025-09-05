
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

    customers = []
    start_position = 1
    max_results = 100  # Set the maximum results per request

    while True:
        # Construct the query with STARTPOSITION and MAXRESULTS
        query = f"SELECT Id, DisplayName FROM Customer STARTPOSITION {start_position} MAXRESULTS {max_results}"
        
        response = requests.get(endpoint, headers=headers, params={'query': query})

        if response.status_code == 200:
            data = response.json()
            fetched_customers = data.get('QueryResponse', {}).get('Customer', [])

            if not fetched_customers:
                # No more customers to fetch
                break

            customers.extend(fetched_customers)

            # Update start_position for the next request
            start_position += max_results

            # If fewer customers were fetched than max_results, we've reached the end
            if len(fetched_customers) < max_results:
                break
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            break

    # Remove duplicates if any
    unique_customers = {customer['Id']: customer for customer in customers}.values()
    
    print(f"Total unique customers retrieved: {len(unique_customers)}")
    return list(unique_customers)

# Run the API call to query customers
result = make_api_call(access_token, realm_id)

# Create a DataFrame from the customer data
df = pd.DataFrame(result)

# Save the result to a CSV file
df.to_csv('QB Customer List.csv', index=False)