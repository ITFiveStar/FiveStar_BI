import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Tabs,
  Tab,
  Link,
  CircularProgress
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  CloudDownload as CloudDownloadIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { ALLOWED_SALES_CHANNELS} from './config/amazon.config';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (data: any[], tab: string) => void;
  activeTab: number; // 0: sales, 1: skuEconomics, 2: inboundShipping, 3: statements, 4: fbmShipping, 5: adsSpend, 6: adsCreditCardPayment, 7: qbAccountMapping
  loading?: boolean;
}

// Define field mappings for Amazon's exported files
const AMAZON_FIELD_MAPPING: Record<string, Record<string, string>> = {
  sales: {
    'amazon-order-id': 'amazon_order_id',
    'purchase-date': 'purchase_date_utc',
    'order-status': 'order_status',
    'fulfillment-channel': 'fulfillment_channel',
    'sales-channel': 'sales_channel',
    'sku': 'sku',
    'item-status': 'item_status',
    'quantity': 'quantity',
    'currency': 'currency',
    'item-price': 'item_price',
    'item-tax': 'item_tax',
    'shipping-price': 'shipping_price',
    'shipping-tax': 'shipping_tax',
    'gift-wrap-price': 'gift_wrap_price',
    'gift-wrap-tax': 'gift_wrap_tax',
    'item-promotion-discount': 'item_promotion_discount',
    'ship-promotion-discount': 'ship_promotion_discount',
    // Capitalized alternatives
    'Amazon-Order-ID': 'amazon_order_id',
    'Purchase-Date': 'purchase_date_utc',
    'Order-Status': 'order_status',
    'Fulfillment-Channel': 'fulfillment_channel',
    'Sales-Channel': 'sales_channel',
    'SKU': 'sku',
    'Item-Status': 'item_status',
    'Quantity': 'quantity',
    'Currency': 'currency',
    'Item-Price': 'item_price',
    'Item-Tax': 'item_tax',
    'Shipping-Price': 'shipping_price',
    'Shipping-Tax': 'shipping_tax',
    'Gift-Wrap-Price': 'gift_wrap_price',
    'Gift-Wrap-Tax': 'gift_wrap_tax',
    'Item-Promotion-Discount': 'item_promotion_discount',
    'Ship-Promotion-Discount': 'ship_promotion_discount'
  },
  skuEconomics: {
    'amazon store': 'amazon_store',
    'start date': 'start_date_pst_pdt',
    'end date': 'end_date_pst_pdt',
    'msku': 'MSKU',
    'currency code': 'currency_code',
    'fba fulfillment fees total': 'FBA_fulfillment_fees_total',
    'sponsored products charge total': 'sponsored_products_charge_total',
    'monthly inventory storage fee total': 'monthly_inventory_storage_fee_total',
    'inbound transportation charge total': 'inbound_transportation_charge_total',
    'Amazon Store': 'amazon_store',
    'Start Date': 'start_date_pst_pdt',
    'End Date': 'end_date_pst_pdt',
    'MSKU': 'MSKU',
    'Currency Code': 'currency_code',
    'FBA Fulfillment Fees Total': 'FBA_fulfillment_fees_total',
    'Sponsored Products Charge Total': 'sponsored_products_charge_total',
    'Monthly Inventory Storage Fee Total': 'monthly_inventory_storage_fee_total',
    'Inbound Transportation Charge Total': 'inbound_transportation_charge_total'
  },
  inboundShipping: {
    'Shipment Name': 'shipment_name',
    'Shipment ID': 'shipment_id',
    'Created': 'created_pst_pdt',
    'Last Updated': 'last_updated_pst_pdt',
    'Ship To': 'ship_to',
    'SKUs': 'MSKU',
    'Units Expected': 'units_expected',
    'Units Located': 'units_located',
    'Status': 'status',
    'Amazon Partnered Carrier Cost': 'amazon_partnered_carrier_cost',
    'MSKU': 'MSKU',
    'shipment name': 'shipment_name',
    'shipment id': 'shipment_id',
    'created': 'created_pst_pdt',
    'last updated': 'last_updated_pst_pdt',
    'ship to': 'ship_to',
    'skus': 'MSKU',
    'units expected': 'units_expected',
    'units located': 'units_located',
    'status': 'status',
    'amazon partnered carrier cost': 'amazon_partnered_carrier_cost',
    'msku': 'MSKU'
  },
  statements: {
    'settlement-id': 'settlement_id',
    'settlement-start-date': 'settlement_start_date_utc',
    'settlement-end-date': 'settlement_end_date_utc',
    'deposit-date': 'deposit_date_utc',
    'total-amount': 'total_amount',
    'currency': 'currency',
    'transaction-type': 'transaction_type',
    'order-id': 'order_id',
    'marketplace-name': 'marketplace_name',
    'amount-type': 'amount_type',
    'amount-description': 'amount_description',
    'amount': 'amount',
    'posted-date-time': 'posted_date_time_utc',
    'sku': 'sku',
    'quantity-purchased': 'quantity_purchased',
    'Settlement-Id': 'settlement_id',
    'Settlement-Start-Date': 'settlement_start_date_utc',
    'Settlement-End-Date': 'settlement_end_date_utc',
    'Deposit-Date': 'deposit_date_utc',
    'Total-Amount': 'total_amount',
    'Currency': 'currency',
    'Transaction-Type': 'transaction_type',
    'Order-Id': 'order_id',
    'Marketplace-Name': 'marketplace_name',
    'Amount-Type': 'amount_type',
    'Amount-Description': 'amount_description',
    'Amount': 'amount',
    'Posted-Date-Time': 'posted_date_time_utc',
    'Sku': 'sku',
    'SKU': 'sku',
    'Quantity-Purchased': 'quantity_purchased'
  },
  fbmShipping: {
    'order_id': 'order_id',
    'Order ID': 'order_id',
    'order id': 'order_id',
    'shipping_id': 'shipping_id',
    'Shipping ID': 'shipping_id',
    'shipping id': 'shipping_id',
    'shipping_cost': 'shipping_cost',
    'Shipping Cost': 'shipping_cost',
    'shipping cost': 'shipping_cost',
    'warehouse_cost': 'warehouse_cost',
    'Warehouse Cost': 'warehouse_cost',
    'warehouse cost': 'warehouse_cost',
    'source': 'source',
    'Source': 'source',
    'payment_date': 'payment_date',
    'Payment Date': 'payment_date',
    'payment date': 'payment_date'
  },
  adsSpend: {
    'Date': 'date_by_day',
    'date': 'date_by_day',
    'date_by_day': 'date_by_day',
    'Advertised SKU': 'sku',
    'advertised sku': 'sku',
    'sku': 'sku',
    'SKU': 'sku',
    'Spend': 'spend',
    'spend': 'spend'
  },
  adsCreditCardPayment: {
    'Invoice': 'invoice_id',
    'invoice': 'invoice_id',
    'invoice_id': 'invoice_id',
    'Invoice ID': 'invoice_id',
    'Issued on': 'issued_on',
    'issued on': 'issued_on',
    'issued_on': 'issued_on',
    'Issued On': 'issued_on',
    'Due date': 'due_date',
    'due date': 'due_date',
    'due_date': 'due_date',
    'Due Date': 'due_date',
    'Total amount billed': 'total_amount_billed',
    'total amount billed': 'total_amount_billed',
    'total_amount_billed': 'total_amount_billed',
    'Total Amount Billed': 'total_amount_billed'
  },
  qbAccountMapping: {
    'statement_category': 'statement_category',
    'statement_pnl_items': 'statement_pnl_items',
    'pnl_account_name': 'pnl_account_name',
    'pnl_account_id': 'pnl_account_id',
    'bs_account_name': 'bs_account_name',
    'bs_account_id': 'bs_account_id',
    'Statement Category': 'statement_category',
    'Statement PnL Items': 'statement_pnl_items',
    'PnL Account Name': 'pnl_account_name',
    'PnL Account ID': 'pnl_account_id',
    'BS Account Name': 'bs_account_name',
    'BS Account ID': 'bs_account_id',
    // Lowercase with spaces (after CSV header processing)
    'statement category': 'statement_category',
    'statement pnl items': 'statement_pnl_items',
    'pnl account name': 'pnl_account_name',
    'pnl account id': 'pnl_account_id',
    'bs account name': 'bs_account_name',
    'bs account id': 'bs_account_id'
  }
};

// Define headers for templates (when users need to create their own CSV from scratch)
const TEMPLATE_HEADERS = {
  inboundShipping: [
    'Shipment Name',
    'Shipment ID',
    'Created',
    'Last Updated',
    'Ship To',
    'SKUs',
    'Units Expected',
    'Units Located',
    'Status',
    'Amazon Partnered Carrier Cost',
    'MSKU'
  ],
  fbmShipping: [
    'Order ID',
    'Shipping ID',
    'Shipping Cost',
    'Warehouse Cost',
    'Source',
    'Payment Date'
  ],
  adsSpend: [
    'Date',
    'Advertised SKU',
    'Spend'
  ],
  adsCreditCardPayment: [
    'Invoice',
    'Issued on',
    'Due date',
    'Total amount billed'
  ],
  qbAccountMapping: [
    'Statement Category',
    'Statement PnL Items',
    'PnL Account Name',
    'PnL Account ID',
    'BS Account Name',
    'BS Account ID'
  ]
};

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({ open, onClose, onUpload, activeTab, loading = false }) => {
  const [error, setError] = useState<string>('');
  const [dialogTab, setDialogTab] = useState<number>(activeTab);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  React.useEffect(() => {
    setError('');
    setUploadProgress('');
    setDialogTab(activeTab);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [open, activeTab]);

  const getTabNameFromIndex = (index: number): string => {
    switch (index) {
      case 0: return 'sales';
      case 1: return 'skuEconomics';
      case 2: return 'inboundShipping';
      case 3: return 'statements';
      case 4: return 'fbmShipping';
      case 5: return 'adsSpend';
      case 6: return 'adsCreditCardPayment';
      case 7: return 'qbAccountMapping';
      default: return 'sales';
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setDialogTab(newValue);
  };

  const getSellerCentralLink = () => {
    switch (dialogTab) {
      case 0:
        return 'https://sellercentral.amazon.com/reportcentral/FlatFileAllOrdersReport/1';
      case 1:
        return 'https://sellercentral.amazon.com/sereport?ref_=xx_specon_dnav_xx';
      case 2:
        return 'https://sellercentral.amazon.com/gp/ssof/shipping-queue.html/ref=xx_fbashipq_dnav_xx#fbashipment';
      case 3:
        return 'https://sellercentral.amazon.com/payments/past-settlements?ref_=xx_settle_ttab_trans';
      case 5:
        return 'https://advertising.amazon.com/reports';
      case 6:
        return 'https://advertising.amazon.com/ads-bg/billing/history';
      default:
        return 'https://sellercentral.amazon.com/ap/signin';
    }
  };

  const handleDownloadTemplate = () => {
    const tabName = getTabNameFromIndex(dialogTab);
    const headers = TEMPLATE_HEADERS[tabName as keyof typeof TEMPLATE_HEADERS];
    
    // Create example row based on tab
    let exampleRow: string[] = [];
    
    switch (tabName) {
      case 'inboundShipping':
        exampleRow = [
          'Shipment A',                     // Shipment Name
          'FBA123ABC',                      // Shipment ID
          'Mar 29, 2024, 10:50 a.m.',      // Created
          'Mar 30, 2024, 2:30 p.m.',       // Last Updated
          'AMZ1',                          // Ship To
          '1',                             // SKUs
          '100',                           // Units Expected
          '100',                           // Units Located
          'CLOSED',                        // Status
          '15.75',                         // Amazon Partnered Carrier Cost
          'EXAMPLE-SKU-001'                // MSKU
        ];
        break;
      case 'fbmShipping':
        exampleRow = [
          '701-0000000-0000000',         // Order ID
          'SHPID12345',                  // Shipping ID
          '12.50',                       // Shipping Cost
          '5.00',                        // Warehouse Cost
          'Amazon',                      // Source
          '2024-04-01 10:00:00'          // Payment Date
        ];
        break;
      case 'adsSpend':
        exampleRow = [
          '2024-08-15',                      // Date
          'ABC-123-DEF',                     // Advertised SKU
          '25.75'                            // Spend
        ];
        break;
      case 'adsCreditCardPayment':
        exampleRow = [
          'INV-202502-001',                  // Invoice
          '2025-02-01',                      // Issued on
          '2025-02-15',                      // Due date
          '125.50'                           // Total amount billed
        ];
        break;
      case 'qbAccountMapping':
        exampleRow = [
          'Order',                           // Statement Category
          'Principal',                       // Statement PnL Items
          'Sales Revenue',                   // PnL Account Name
          '401000',                          // PnL Account ID
          'Accounts Receivable',             // BS Account Name
          '120000'                           // BS Account ID
        ];
        break;
    }
    
    // Ensure all rows have the same number of columns
    if (headers && exampleRow && headers.length !== exampleRow.length) {
      console.warn(`Header length (${headers.length}) doesn't match example row length (${exampleRow.length})`);
      // Adjust example row to match headers length
      if (exampleRow.length > headers.length) {
        exampleRow = exampleRow.slice(0, headers.length);
      } else {
        // Fill missing values with empty strings
        while (exampleRow.length < headers.length) {
          exampleRow.push('');
        }
      }
    }
    
    // Process headers and example row to handle special characters properly
    const processedHeaders = headers ? headers.map(header => {
      // If header contains commas, wrap in quotes
      return header.includes(',') ? `"${header}"` : header;
    }) : [];
    
    const processedExampleRow = exampleRow.map(value => {
      // If value contains commas or quotes, handle properly for CSV
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    
    // Create CSV content with headers and example row
    const csvContent = [
      processedHeaders.join(','),
      processedExampleRow.join(',')
    ].join('\n');
    
    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amazon_${tabName}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Add a helper function to convert scientific notation to full string representation
  const parseNumberOrScientificNotation = (value: string): string => {
    if (!value) return value;
    
    // Check if it might be in scientific notation (contains 'e' or 'E')
    if (value.toLowerCase().includes('e')) {
      try {
        // Parse it as a number and convert to full string representation
        const num = Number(value);
        if (!isNaN(num)) {
          // Use toFixed with a large precision to get the full representation without scientific notation
          // Then trim trailing zeros and decimal point if it's a whole number
          return num.toFixed(20).replace(/\.?0+$/, '');
        }
      } catch (e) {
        console.warn('Failed to parse potential scientific notation:', value);
      }
    }
    return value;
  };

  const parseCsvToJson = (csvText: string): any[] => {
    try {
      const lines = csvText.split('\n');
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least headers and one data row');
      }
      
      // Find the header line (skip potential metadata rows at the beginning)
      let headerIndex = 0;
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        if (dialogTab === 0) {
          // For Amazon Orders, check for a line that contains all the expected key fields
          if (lines[i].toLowerCase().includes('amazon-order-id') && 
              lines[i].toLowerCase().includes('purchase-date') && 
              lines[i].toLowerCase().includes('sku')) {
            headerIndex = i;
            console.log('Found Amazon Orders header at line', i + 1, ':', lines[i]);
            break;
          }
        } else if (lines[i].includes('Amazon Store') || 
                  lines[i].includes('Shipment Name') || 
                  lines[i].includes('Settlement ID')) {
          headerIndex = i;
          break;
        }
      }
      
      console.log('Using header line:', lines[headerIndex]);
      const headers = lines[headerIndex].split(',').map(h => h.trim().toLowerCase());
      console.log('Parsed headers:', headers);
      
      // Determine which field mapping to use based on the current tab
      const tabName = getTabNameFromIndex(dialogTab);
      const fieldMapping = AMAZON_FIELD_MAPPING[tabName as keyof typeof AMAZON_FIELD_MAPPING];
      
      // Check if we have any matching fields in our mapping
      const matchingFields = headers.filter(header => 
        Object.keys(fieldMapping).some(key => key.toLowerCase() === header)
      );
      
      console.log('Found matching fields:', matchingFields);
      
      if (matchingFields.length === 0) {
        throw new Error(`Could not find any matching fields in the CSV. Please check the file format and try again.`);
      }
      
      const results = lines.slice(headerIndex + 1)
        .filter(line => line.trim())
        .map((line, idx) => {
          try {
            // Handle CSV fields properly (respect quotes, commas inside quotes, etc.)
            const values: string[] = [];
            let currentValue = '';
            let isInsideQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
                isInsideQuotes = !isInsideQuotes;
              } else if (char === ',' && !isInsideQuotes) {
                values.push(currentValue);
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            
            // Don't forget to add the last field
            values.push(currentValue);
            
            // Create an object from headers and values
            const record: Record<string, any> = {};
            for (let i = 0; i < Math.min(headers.length, values.length); i++) {
              // Clean the value and handle scientific notation for IDs
              let value = values[i].replace(/^"|"$/g, '').trim(); // Remove surrounding quotes
              
              // Apply special handling for shipping_id, order_id, or other ID fields that might be in scientific notation
              if (headers[i].toLowerCase().includes('id')) {
                value = parseNumberOrScientificNotation(value);
              }
              
              record[headers[i]] = value;
            }
            
            if (idx === 0) {
              console.log('First row parsed:', record);
            }
            
            return record;
          } catch (e) {
            console.error(`Error parsing line ${idx + headerIndex + 2}:`, line, e);
            throw new Error(`Error parsing line ${idx + headerIndex + 2}: ${e instanceof Error ? e.message : String(e)}`);
          }
        });
      
      console.log(`Successfully parsed ${results.length} rows from CSV`);
      return results;
    } catch (e) {
      console.error('CSV parsing error:', e);
      throw e;
    }
  };

  // Add a function to parse TXT files (tab-separated) for All Orders and Statements data
  const parseTxtToJson = (text: string): Record<string, any>[] => {
    // Split the text into lines
    const lines = text.split('\n');
    if (lines.length < 2) {
      throw new Error('Invalid TXT file format. Expected at least a header line and data line.');
    }
    
    // Extract headers from the first line (tab-separated)
    const headers = lines[0].split('\t').map(header => header.trim().toLowerCase());
    console.log('Parsed TXT headers:', headers);
    
    // Determine which field mapping to use based on the current tab
    const tabName = getTabNameFromIndex(dialogTab);
    const fieldMapping = AMAZON_FIELD_MAPPING[tabName as keyof typeof AMAZON_FIELD_MAPPING];
    
    // Check if we have any matching fields in our mapping
    const matchingFields = headers.filter(header => 
      Object.keys(fieldMapping).some(key => key.toLowerCase() === header)
    );
    
    console.log('Found matching fields:', matchingFields);
    
    if (matchingFields.length === 0) {
      throw new Error(`Could not find any matching fields in the TXT file. Please check the file format and try again.`);
    }
    
    // Parse each data line
    const jsonData: Record<string, any>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue; // Skip empty lines
      
      const values = line.split('\t');
      if (values.length !== headers.length) {
        console.warn(`Line ${i + 1} has ${values.length} values but expected ${headers.length}. Skipping.`);
        continue;
      }
      
      const record: Record<string, any> = {};
      headers.forEach((header, index) => {
        // Preserve string values exactly as they are
        record[header] = values[index] ? values[index].trim() : '';
      });
      
      // Add the record to our data array
      if (Object.keys(record).length > 0) {
        if (i === 1 || i === 2) {
          console.log(`Sample record ${i}:`, record);
        }
        jsonData.push(record);
      }
    }
    
    console.log(`Parsed ${jsonData.length} records from TXT file`);
    return jsonData;
  };

  // Check if current tab supports multiple file uploads
  const supportsMultipleFiles = () => {
    return dialogTab === 0 || dialogTab === 1 || dialogTab === 3 || dialogTab === 5; // All Orders, SKU Economics, Statements, Ad Spend by Day
  };

  // Process a single file (existing logic)
  const processSingleFile = async (file: File, tabName: string): Promise<any[]> => {
    let jsonData: Record<string, any>[] = [];
    
    // Parse file based on its extension and tab
    if ((dialogTab === 0 || dialogTab === 3) && file.name.toLowerCase().endsWith('.txt')) {
      // Parse TXT for All Orders (tab index 0) or Statements (tab index 3)
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      console.log(`File loaded: ${file.name}, size: ${text.length} characters`);
      jsonData = parseTxtToJson(text);
    } else {
      // Parse CSV for other tabs
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      console.log(`File loaded: ${file.name}, size: ${text.length} characters`);
      jsonData = parseCsvToJson(text);
    }
    
    if (jsonData.length === 0) {
      throw new Error(`No valid data rows found in the ${(dialogTab === 0 || dialogTab === 3) ? 'TXT' : 'CSV'} file: ${file.name}`);
    }
    
    console.log(`Parsed ${jsonData.length} records from ${(dialogTab === 0 || dialogTab === 3) ? 'TXT' : 'CSV'}: ${file.name}. Mapping fields now...`);
    
    // Map fields based on the active tab
    const fieldMapping = AMAZON_FIELD_MAPPING[tabName as keyof typeof AMAZON_FIELD_MAPPING];
    
    let mappedData = jsonData.map((record, index) => {
      try {
        const mappedRecord: Record<string, any> = {};
        
        // Map fields and convert types as needed
        Object.keys(record).forEach(key => {
          const lowerKey = key.toLowerCase();
          const mappedKey = fieldMapping[lowerKey];
          
          if (mappedKey) {
            let value = record[key];
            
            // Convert numeric fields to numbers
            if (
              mappedKey.includes('quantity') || 
              mappedKey.includes('price') || 
              mappedKey.includes('tax') || 
              mappedKey.includes('discount') || 
              mappedKey.includes('fee') || 
              mappedKey.includes('total') || 
              (mappedKey === 'amount' && !mappedKey.includes('_type') && !mappedKey.includes('_description')) || 
              mappedKey.includes('cost') || 
              mappedKey.includes('units')
            ) {
              // Handle empty values or non-numeric values
              value = value.trim() ? Number(value.replace(/[^0-9.-]+/g, '')) : 0;
            }
            
            // Handle date fields
            if (mappedKey.includes('date')) {
              try {
                if (value.trim()) {
                  // For statements tab, preserve original format for specific UTC fields
                  if (dialogTab === 3 && 
                      (mappedKey === 'settlement_start_date_utc' ||
                       mappedKey === 'settlement_end_date_utc' ||
                       mappedKey === 'deposit_date_utc' ||
                       mappedKey === 'posted_date_time_utc')) {
                    // Keep the raw value as-is since TXT files already have correct format: "YYYY-MM-DD HH:MM:SS UTC"
                    value = value.trim();
                  }
                  // For inbound shipping PST/PDT fields, preserve original format (no timezone conversion)
                  else if (mappedKey === 'created_pst_pdt' || mappedKey === 'last_updated_pst_pdt') {
                    value = value.trim();
                  } else {
                    // Original date parsing for other tabs
                    const parsedDate = new Date(value);
                    if (!isNaN(parsedDate.getTime())) {
                      value = parsedDate.toISOString();
                    }
                  }
                }
              } catch (e) {
                console.error(`Failed to parse date: ${value}`, e);
              }
            }
            mappedRecord[mappedKey] = value;
          }
        });
        
        // Check if the required fields are mapped based on tab (RESTORE ORIGINAL LOGIC)
        if (tabName === 'sales' && (!mappedRecord.amazon_order_id || !mappedRecord.purchase_date_utc)) {
          throw new Error(`Required fields missing in ${file.name}: amazon_order_id and purchase_date_utc must be present`);
        } else if (tabName === 'skuEconomics' && (!mappedRecord.MSKU || !mappedRecord.start_date_pst_pdt)) {
          throw new Error(`Required fields missing in ${file.name}: MSKU and start_date_pst_pdt must be present`);
        } else if (tabName === 'statements' && (!mappedRecord.settlement_id)) {
          throw new Error(`Required fields missing in ${file.name}: settlement_id must be present`);
        } else if (tabName === 'qbAccountMapping' && (!mappedRecord.statement_category || !mappedRecord.statement_pnl_items)) {
          throw new Error(`Required fields missing in ${file.name}: statement_category and statement_pnl_items must be present`);
        }
        
        if (index === 0) {
          console.log('First record after mapping:', mappedRecord);
        }
        
        return mappedRecord;
      } catch (e) {
        console.error(`Error mapping record at index ${index} in ${file.name}:`, record, e);
        throw new Error(`Error mapping record at index ${index} in ${file.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
    
    // Filter orders based on sales channel if this is the sales tab
    if (tabName === 'sales') {
      const originalCount = mappedData.length;
      mappedData = mappedData.filter(item => 
        ALLOWED_SALES_CHANNELS.includes(item.sales_channel)
      );
      
      console.log(`Filtered orders in ${file.name} from ${originalCount} to ${mappedData.length} based on allowed sales channels: ${ALLOWED_SALES_CHANNELS.join(', ')}`);
      
      if (mappedData.length === 0) {
        throw new Error(`No records in ${file.name} match the allowed sales channels: ${ALLOWED_SALES_CHANNELS.join(', ')}. Please check your data.`);
      }
    }
    
    return mappedData;
  };

  // Updated file upload handler to support multiple files
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setUploadProgress('');
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const tabName = getTabNameFromIndex(dialogTab);
      const allProcessedData: any[] = [];
      
      // Process files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Processing file ${i + 1} of ${files.length}: ${file.name}`);
        
        try {
          const fileData = await processSingleFile(file, tabName);
          allProcessedData.push(...fileData);
          console.log(`Successfully processed ${file.name}: ${fileData.length} records`);
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      if (allProcessedData.length === 0) {
        throw new Error(`No valid data found in any of the uploaded files`);
      }
      
      console.log(`Total processed records from ${files.length} files: ${allProcessedData.length}`);
      setUploadProgress(`Successfully processed ${files.length} files with ${allProcessedData.length} total records`);
      
      // Upload all processed data at once
      onUpload(allProcessedData, tabName);
    } catch (error) {
      console.error('File upload/processing error:', error);
      setError(error instanceof Error ? error.message : 'Failed to parse files');
      setUploadProgress('');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getDialogTitle = () => {
    switch (dialogTab) {
      case 0: return 'Upload Amazon Sales Records';
      case 1: return 'Upload SKU Economics Data';
      case 2: return 'Upload Inbound Shipping Data';
      case 3: return 'Upload Statements Data';
      case 4: return 'Upload FBM Shipping Cost Data';
      case 5: return 'Upload Ad Spend by Day Data';
      case 6: return 'Upload Ad Credit Card Payment Data';
      case 7: return 'Upload QB Account Mapping Data';
      default: return 'Bulk Upload';
    }
  };

  const getUploadInstructions = () => {
    switch (dialogTab) {
      case 0:
        return (
          <>
            <Typography variant="body1" gutterBottom>
              1. Download "All Orders" report from Amazon Seller Central
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.open(getSellerCentralLink(), '_blank')}
              startIcon={<LaunchIcon sx={{ verticalAlign: 'middle' }} />}
              size="small"
              color="primary"
              sx={{ 
                mb: 3, 
                width: '220px',
                '& .MuiButton-startIcon': {
                  marginRight: 1.5,
                  marginTop: 0
                }
              }}
            >
              Amazon Seller Central
            </Button>
            
            <Typography variant="body1" gutterBottom>
              2. Upload your downloaded All Orders Report (.txt files)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              You can select multiple .txt files to upload at once. We will automatically map the uploaded data to our system.
            </Typography>
          </>
        );
      case 1:
        return (
          <>
            <Typography variant="body1" gutterBottom>
              1. Download "SKU Economics" report from Amazon Seller Central
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please download data at monthly level with all fields selected for your desired marketplace.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Example: when generate the report, choose the desired marketplace, choose data aggregation level as "MSKU", select start date as "March 1, 2025" and end date as "March 31, 2025", then select every box under "Step 2 Set Report Configurations" section.
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.open(getSellerCentralLink(), '_blank')}
              startIcon={<LaunchIcon sx={{ verticalAlign: 'middle' }} />}
              size="small"
              color="primary"
              sx={{ 
                mb: 3, 
                width: '220px',
                '& .MuiButton-startIcon': {
                  marginRight: 1.5,
                  marginTop: 0
                }
              }}
            >
              Amazon Seller Central
            </Button>
            
            <Typography variant="body1" gutterBottom>
              2. Upload your downloaded "SKU Economics" reports (.csv files)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              You can select multiple .csv files to upload at once. We will automatically map the uploaded data to our system.
            </Typography>
          </>
        );
      case 2:
        return (
          <>
            <Typography variant="body1" gutterBottom>
              1. Download "FBA Inbound Shipping Queue" report from Amazon Seller Central
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.open(getSellerCentralLink(), '_blank')}
              startIcon={<LaunchIcon sx={{ verticalAlign: 'middle' }} />}
              size="small"
              color="primary"
              sx={{ 
                mb: 3, 
                width: '220px',
                '& .MuiButton-startIcon': {
                  marginRight: 1.5,
                  marginTop: 0
                }
              }}
            >
              Amazon Seller Central
            </Button>
            
            <Typography variant="body1" gutterBottom>
              2. Fill in the template with your data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Follow the example row format in the template. You will find most of the data from "FBA Inbound Shipping Queue" report, then fill other information including "Amazon Partnered Carrier Cost" and "MSKU" in the template.
            </Typography>
            <Button
              variant="contained"
              onClick={handleDownloadTemplate}
              startIcon={<CloudDownloadIcon sx={{ verticalAlign: 'middle', marginTop: '-3px' }} />}
              size="small"
              color="primary"
              sx={{ 
                mb: 3, 
                width: '220px',
                '& .MuiButton-startIcon': {
                  marginRight: 1.5,
                  marginTop: 0
                }
              }}
            >
              Download Template
            </Button>
            
            <Typography variant="body1" gutterBottom>
              3. Upload your completed "FBA Inbound Shipping" report (.csv file)
            </Typography>
          </>
        );
      case 3:
        return (
          <>
            <Typography variant="body1" gutterBottom>
              1. Download "Statements" report from Amazon Seller Central
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Please download the Statements reports in the "Flat File V2" format. You will find the reports from "Amazon Seller Central - Payments - Payments - All Statements".
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.open(getSellerCentralLink(), '_blank')}
              startIcon={<LaunchIcon sx={{ verticalAlign: 'middle' }} />}
              size="small"
              color="primary"
              sx={{ 
                mb: 3, 
                width: '220px',
                '& .MuiButton-startIcon': {
                  marginRight: 1.5,
                  marginTop: 0
                }
              }}
            >
              Amazon Seller Central
            </Button>
            
            <Typography variant="body1" gutterBottom>
              2. Upload your downloaded "Statements" reports (.txt files)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              You can select multiple .txt files to upload at once. We will automatically map the Amazon columns to our system.
            </Typography>
          </>
        );
      case 4:
        return (
          <>
            <Typography variant="body1" gutterBottom>
              1. Download the template and fill with your FBM shipping cost data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Follow the example row format in the template.
            </Typography>
            <Button
              variant="contained"
              onClick={handleDownloadTemplate}
              startIcon={<CloudDownloadIcon sx={{ verticalAlign: 'middle', marginTop: '-3px' }} />}
              size="small"
              color="primary"
              sx={{ 
                mb: 3, 
                width: '220px',
                '& .MuiButton-startIcon': {
                  marginRight: 1.5,
                  marginTop: 0
                }
              }}
            >
              Download Template
            </Button>
            
            <Typography variant="body1" gutterBottom>
              2. Upload your completed "FBM Shipping Cost" file (.csv file)
            </Typography>
          </>
        );
      case 5:
        return (
          <>
            <Typography variant="body1" gutterBottom>
              1. Download advertising reports from Amazon Advertising Console
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.open(getSellerCentralLink(), '_blank')}
              startIcon={<LaunchIcon sx={{ verticalAlign: 'middle' }} />}
              size="small"
              color="primary"
              sx={{ 
                mb: 3, 
                width: '220px',
                '& .MuiButton-startIcon': {
                  marginRight: 1.5,
                  marginTop: 0
                }
              }}
            >
              Amazon Advertising
            </Button>
            
            <Typography variant="body1" gutterBottom>
              2. Export your data as CSV and upload
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Your CSV file should contain 3 columns: "Date", "Advertised SKU", and "Spend". If you have Excel files, save them as CSV format first. You can select multiple CSV files to upload at once.
            </Typography>
          </>
        );
      case 6:
        return (
          <>
            <Typography variant="body1" gutterBottom>
              1. Download billing history from Amazon Ads Billing Portal (Non-Seller Payable Payment Method Invoices Only)
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.open(getSellerCentralLink(), '_blank')}
              startIcon={<LaunchIcon sx={{ verticalAlign: 'middle' }} />}
              size="small"
              color="primary"
              sx={{ 
                mb: 3, 
                width: '220px',
                '& .MuiButton-startIcon': {
                  marginRight: 1.5,
                  marginTop: 0
                }
              }}
            >
              Amazon Ads Billing
            </Button>
            
            <Typography variant="body1" gutterBottom>
              2. Export your billing data as CSV and upload
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Your CSV file should contain 4 columns: "Invoice", "Issued on", "Due date", and "Total amount billed".
            </Typography>
          </>
        );
      case 7:
        return (
          <>
            <Typography variant="body1" gutterBottom>
              1. Download the template and fill with your QuickBooks Account Mapping data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Follow the example row format in the template. This table maps Amazon statement categories to QuickBooks accounts.
            </Typography>
            <Button
              variant="contained"
              onClick={handleDownloadTemplate}
              startIcon={<CloudDownloadIcon sx={{ verticalAlign: 'middle', marginTop: '-3px' }} />}
              size="small"
              color="primary"
              sx={{ 
                mb: 3, 
                width: '220px',
                '& .MuiButton-startIcon': {
                  marginRight: 1.5,
                  marginTop: 0
                }
              }}
            >
              Download Template
            </Button>
            
            <Typography variant="body1" gutterBottom>
              2. Upload your completed "QB Account Mapping" file (.csv file)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Your CSV file should contain 6 columns: "Statement Category", "Statement PnL Items", "PnL Account Name", "PnL Account ID", "BS Account Name", and "BS Account ID".
            </Typography>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {getDialogTitle()}
      </DialogTitle>
      <Tabs
        value={dialogTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Sales Records" />
        <Tab label="SKU Economics" />
        <Tab label="Inbound Shipping" />
        <Tab label="Statements" />
        <Tab label="FBM Shipping" />
        <Tab label="Ad Spend by Day" />
        <Tab label="Ad Credit Card Payment" />
        <Tab label="QB Account Mapping" />
      </Tabs>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {getUploadInstructions()}

          <Button
            variant="contained"
            component="label"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon sx={{ verticalAlign: 'middle', marginTop: '-3px' }} />}
            size="small"
            color="primary"
            disabled={loading}
            sx={{ 
              mb: 2, 
              width: '220px',
              '& .MuiButton-startIcon': {
                marginRight: 1.5,
                marginTop: 0
              }
            }}
          >
            {loading ? 'Uploading...' : (dialogTab === 0 || dialogTab === 3) ? 'Upload TXT' : 'Upload CSV'}
            <input
              type="file"
              hidden
              ref={fileInputRef}
              accept={(dialogTab === 0 || dialogTab === 3) ? ".txt" : ".csv"}
              multiple={supportsMultipleFiles()}
              onChange={handleFileUpload}
              disabled={loading}
            />
          </Button>

          {uploadProgress && (
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              {uploadProgress}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          {dialogTab === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Note: Only orders with the following sales channels will be imported: {ALLOWED_SALES_CHANNELS.join(', ')}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={loading}>Cancel</Button>
        <Button onClick={onClose} variant="contained" color="primary" disabled={loading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkUploadDialog; 