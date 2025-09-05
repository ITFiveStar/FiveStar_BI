"""
Memory-based file processor for online deployment
Replaces local file system approach with in-memory processing
"""

import pandas as pd
import io
from typing import Dict, List, Any

class MemoryFileProcessor:
    """
    Process uploaded files in memory without saving to local file system
    Suitable for online deployment and cloud environments
    """
    
    def __init__(self):
        self.files_data = {}
    
    def _detect_file_format(self, content: str) -> str:
        """
        Auto-detect file format from content
        Returns the best guess for pandas read method
        """
        lines = content.strip().split('\n')
        if not lines:
            return 'csv'
        
        # Check first few lines for delimiter patterns
        first_line = lines[0]
        
        # Count different delimiters
        tab_count = first_line.count('\t')
        comma_count = first_line.count(',')
        pipe_count = first_line.count('|')
        
        # Amazon statement files are often tab-separated
        if tab_count > comma_count and tab_count > 0:
            return 'tab'
        elif pipe_count > comma_count and pipe_count > 0:
            return 'pipe'
        else:
            return 'csv'
    
    def add_file_from_upload(self, file_key: str, file_object, file_type: str = 'auto'):
        """
        Add file from Flask upload to memory processor
        
        Args:
            file_key: Identifier for the file
            file_object: Flask file upload object
            file_type: Type of file ('auto', 'csv', 'excel', 'txt', etc.)
                      'auto' will attempt to detect format automatically
        """
        # Read file content first for detection
        file_data = file_object.read()
        
        # Detect file type if auto
        if file_type.lower() == 'auto':
            filename = getattr(file_object, 'filename', '')
            if filename.endswith(('.xlsx', '.xls')):
                file_type = 'excel'
            else:
                # Try to decode as text and detect delimiter
                try:
                    content = file_data.decode('utf-8')
                    format_type = self._detect_file_format(content)
                    file_type = 'txt'  # Will use auto-detection for delimiter
                except UnicodeDecodeError:
                    file_type = 'excel'  # Assume binary file is Excel
        
        # Process based on detected/specified type
        if file_type.lower() in ['csv']:
            # Read CSV directly
            content = file_data.decode('utf-8')
            df = pd.read_csv(io.StringIO(content))
            self.files_data[file_key] = df
        elif file_type.lower() in ['txt', 'tsv']:
            # Read text files with auto-detection of delimiter
            content = file_data.decode('utf-8')
            format_type = self._detect_file_format(content)
            
            # Statement files are typically tab-separated according to original code
            if 'statement' in file_key.lower() or format_type == 'tab':
                df = pd.read_csv(io.StringIO(content), sep='\t')
            elif format_type == 'pipe':
                df = pd.read_csv(io.StringIO(content), sep='|')
            else:
                # Default to comma-separated
                df = pd.read_csv(io.StringIO(content))
            
            self.files_data[file_key] = df
        elif file_type.lower() in ['xlsx', 'xls', 'excel']:
            # Read Excel directly from binary data
            df = pd.read_excel(io.BytesIO(file_data))
            self.files_data[file_key] = df
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    def combine_files_same_folder_differentiation(self, file_type: str) -> pd.DataFrame:
        """
        Replaces the original function that reads from folder
        Now works with files stored in memory
        """
        if file_type == 'all orders':
            data_list = []
            for file_key, df in self.files_data.items():
                if 'order' in file_key.lower():
                    required_columns = [
                        'amazon-order-id', 'purchase-date', 'order-status', 'fulfillment-channel', 
                        'sales-channel', 'sku', 'item-status', 'quantity', 'currency', 
                        'item-price', 'item-tax', 'shipping-price', 'shipping-tax', 
                        'gift-wrap-price', 'gift-wrap-tax', 'item-promotion-discount', 
                        'ship-promotion-discount'
                    ]
                    # Initialize missing columns with NaN
                    for column in required_columns:
                        if column not in df.columns:
                            df[column] = pd.NA
                    # Create dataframe with required columns only
                    df = df[required_columns]
                    data_list.append(df)
            
            if data_list:
                return pd.concat(data_list, ignore_index=True)
            else:
                # Return empty DataFrame with required columns
                required_columns = [
                    'amazon-order-id', 'purchase-date', 'order-status', 'fulfillment-channel', 
                    'sales-channel', 'sku', 'item-status', 'quantity', 'currency', 
                    'item-price', 'item-tax', 'shipping-price', 'shipping-tax', 
                    'gift-wrap-price', 'gift-wrap-tax', 'item-promotion-discount', 
                    'ship-promotion-discount'
                ]
                return pd.DataFrame(columns=required_columns)
        
        elif file_type == 'sku economics':
            data_list = []
            for file_key, df in self.files_data.items():
                if 'economic' in file_key.lower():
                    required_columns = ['Amazon store', 'Start date', 'End date', 'MSKU', 'Currency code', 
                                      'FBA fulfilment fees total', 'Sponsored Products charge total', 
                                      'Monthly inventory storage fee total', 'Inbound transportation charge total']
                    # Initialize missing columns with NaN
                    for column in required_columns:
                        if column not in df.columns:
                            df[column] = pd.NA
                    # Create dataframe with required columns only
                    df = df[required_columns]
                    data_list.append(df)
            
            if data_list:
                return pd.concat(data_list, ignore_index=True)
            else:
                # Return empty DataFrame with required columns
                required_columns = ['Amazon store', 'Start date', 'End date', 'MSKU', 'Currency code', 
                                  'FBA fulfilment fees total', 'Sponsored Products charge total', 
                                  'Monthly inventory storage fee total', 'Inbound transportation charge total']
                return pd.DataFrame(columns=required_columns)
        
        elif file_type == 'statements':
            data_list = []
            for file_key, df in self.files_data.items():
                if 'statement' in file_key.lower():
                    required_columns = ['settlement-id', 'settlement-start-date', 'settlement-end-date', 'deposit-date', 'total-amount', 'currency', 
                                      'transaction-type', 'order-id', 'marketplace-name', 
                                      'amount-type', 'amount-description', 'amount', 'posted-date-time',
                                      'sku', 'quantity-purchased']
                    # Initialize missing columns with NaN
                    for column in required_columns:
                        if column not in df.columns:
                            df[column] = pd.NA
                    # Create dataframe with required columns only
                    df = df[required_columns]
                    data_list.append(df)
            
            if data_list:
                return pd.concat(data_list, ignore_index=True)
            else:
                # Return empty DataFrame with required columns
                required_columns = ['settlement-id', 'settlement-start-date', 'settlement-end-date', 'deposit-date', 'total-amount', 'currency', 
                                  'transaction-type', 'order-id', 'marketplace-name', 
                                  'amount-type', 'amount-description', 'amount', 'posted-date-time',
                                  'sku', 'quantity-purchased']
                return pd.DataFrame(columns=required_columns)
        
        else:
            raise ValueError(f"Unknown file type: {file_type}")
    
    def get_single_file(self, file_identifier: str) -> pd.DataFrame:
        """
        Get a single file by exact key or partial match
        """
        # Try exact match first
        if file_identifier in self.files_data:
            return self.files_data[file_identifier]
        
        # Try partial match
        for key, df in self.files_data.items():
            if file_identifier.lower() in key.lower():
                return df
        
        raise KeyError(f"File not found: {file_identifier}")
    
    def clear_files(self):
        """Clear all files from memory"""
        self.files_data.clear()
    
    def list_files(self) -> List[str]:
        """List all file keys in memory"""
        return list(self.files_data.keys())
