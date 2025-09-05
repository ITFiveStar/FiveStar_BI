import os
import sys
current_directory = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_directory, os.pardir, os.pardir, os.pardir))
sys.path.append(project_root)

import time
import requests
from dotenv import load_dotenv, set_key, dotenv_values


env_path = os.path.join(project_root, 'backend', 'processing', 'api', '.env')
config = dotenv_values(env_path)

# Fetch tokens and expiration from .env
access_token = config.get('ACCESS_TOKEN')
refresh_token = config.get('REFRESH_TOKEN')
realm_id = config.get('REALM_ID')
token_expiration = float(config.get('TOKEN_EXPIRATION'))

client_id = config.get('CLIENT_ID')  
client_secret = config.get('CLIENT_SECRET')

# URL for refreshing the token
token_url = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

# Function to manually update the .env file without adding quotes
def update_env_file(env_path, key, value):
    """Update the .env file with the given key-value pair without adding single quotes."""
    # Read the existing content of the .env file
    with open(env_path, 'r') as file:
        lines = file.readlines()

    # Update the key with the new value (strip any single quotes around the value)
    updated_lines = []
    for line in lines:
        if line.startswith(f'{key}='):
            updated_lines.append(f'{key}={value}\n')
        else:
            updated_lines.append(line)

    # Write the updated content back to the .env file
    with open(env_path, 'w') as file:
        file.writelines(updated_lines)

def refresh_access_token():
    """Refresh the access token using the refresh token."""
    global access_token, refresh_token, realm_id, token_expiration
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
    }
    payload = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': client_id,
        'client_secret': client_secret,
    }

    try:
        response = requests.post(token_url, headers=headers, data=payload, timeout=10)
        response.raise_for_status()

        tokens = response.json()
        access_token = tokens['access_token']
        refresh_token = tokens['refresh_token']
        realm_id = tokens.get('realmId', realm_id)  
        token_expiration = time.time() + tokens['expires_in']

        # Manually update the tokens in the .env file without single quotes
        update_env_file(env_path, 'ACCESS_TOKEN', access_token)
        update_env_file(env_path, 'REFRESH_TOKEN', refresh_token)
        update_env_file(env_path, 'REALM_ID', realm_id)
        update_env_file(env_path, 'TOKEN_EXPIRATION', str(token_expiration))
        print("Token and Realm ID refreshed successfully!")

    except requests.exceptions.RequestException as e:
        print(f"Failed to refresh token: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")


def check_token_validity():
    """Check if the access token is still valid. Refresh if expired."""
    if time.time() > token_expiration:
        print("Access token expired. Refreshing...")
        refresh_access_token()
    else:
        print("Access token is still valid.")
    
    return access_token

# def make_api_call():
#     """Make a request to the API using the access token."""
#     check_token_validity()  # Ensure we have a valid token before making a request

#     base_url = 'https://sandbox-quickbooks.api.intuit.com'
#     url = f'{base_url}/v3/company/{realm_id}/companyinfo/{realm_id}'
#     headers = {
#         'Authorization': f'Bearer {access_token}',
#         'Accept': 'application/json'
#     }

#     response = requests.get(url, headers=headers)

#     print(f"Status Code: {response.status_code}")
#     print(f"Response Text: {response.text}")
#     if response.status_code == 200:
#         return response.json()
#     else:
#         return None

# # Example usage:
# data = make_api_call()
# print(data)
