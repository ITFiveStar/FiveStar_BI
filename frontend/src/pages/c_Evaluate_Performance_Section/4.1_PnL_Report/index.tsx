import React, { useState, useEffect } from 'react';
import { Box, Paper, styled, Typography, CircularProgress, TextField, MenuItem, Autocomplete, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Menu, ListItemIcon, ListItemText, MenuItem as MenuItemMUI, Dialog, DialogTitle, DialogContent, DialogActions, Button, Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import axios from 'axios';
import DownloadIcon from '@mui/icons-material/Download';
import CodeIcon from '@mui/icons-material/Code';
import TableChartIcon from '@mui/icons-material/TableChart';

// Styled components for the bento grid
const BentoGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(6, 1fr)',
  gridAutoRows: '1fr', // Let the browser calculate row heights automatically
  gap: theme.spacing(2),
  height: '100%', // Fill the entire wrapper
  width: '100%',
  margin: 0,
  padding: 0, // Remove padding
  overflow: 'hidden', // Prevent scrolling inside the grid
}));

const BentoItem = styled(Paper)(({ theme }) => ({
  // border: '1px dashed #aaa',
  borderRadius: 8,
  padding: 0, // Remove padding completely
  backgroundColor: '#ffffff',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto', // Allow scrolling inside items if needed
  minHeight: 0, // Important for grid items to respect container height
  height: '100%', // Fill the grid cell completely
}));

// Card components based on the provided reference code
const CardContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#fefefe',
  padding: 0, // Remove default padding
  paddingTop: theme.spacing(2),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  paddingBottom: theme.spacing(0.5), // Reduced bottom padding
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  marginBottom: theme.spacing(2),
  border: '1px solid #e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1, // Allow card to grow and fill available space
  '&:last-child': {
    marginBottom: 0, // Remove margin from the last card
  }
}));

// Special container for filters with no padding
const FilterCardContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#fefefe',
  padding: 0,
  paddingTop: theme.spacing(0),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  paddingBottom: theme.spacing(0), // Reduced bottom padding
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  marginBottom: theme.spacing(2),
  border: '1px solid #e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  '&:last-child': {
    marginBottom: 0,
  }
}));

const CardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: '#47709B',
  marginBottom: theme.spacing(0.8),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  '& svg': {
    marginRight: theme.spacing(1),
    color: '#47709B',
  }
}));

const CardContent = styled(Box)(({ theme }) => ({
  fontSize: '0.9rem',
  color: '#666',
  height: '100%',
  p: 0,
  // marginBottom: theme.spacing(0.8),
  flexGrow: 1,
  position: 'relative', 
  // minHeight: '30px', 
}));

// Styled filter components
const FilterContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
}));

const FilterLabel = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.9rem',
  color: '#555',
  marginRight: theme.spacing(1),
  whiteSpace: 'nowrap',
  minWidth: '50px',
}));

// Custom styles for smaller dropdowns
const selectSx = {
  fontSize: '0.85rem',
  '.MuiSelect-select': {
    padding: '4px 14px',
    height: '18px',
  },
  '& .MuiTypography-subtitle2': {
    color: '#9e9e9e'
  }
};

const menuItemSx = {
  fontSize: '0.85rem',
  paddingTop: '2px',
  paddingBottom: '2px',
  minHeight: '25px',
  '&.Mui-selected': {
    backgroundColor: '#f0f7ff'
  }
};

// Styled table components
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderBottom: '1px solid #f0f0f0',
  fontSize: '0.85rem',
  height: '42px', // Set a consistent minimum height for all cells
  display: 'table-cell',
  verticalAlign: 'middle',
}));

// Update StyledMetricTableCell to be sticky
const StyledMetricTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderBottom: '1px solid #f0f0f0',
  fontSize: '0.85rem',
  fontWeight: 500,
  width: '220px',
  height: '42px',
  display: 'table-cell',
  verticalAlign: 'middle',
  position: 'sticky',
  left: 0,
  backgroundColor: 'inherit', // This will inherit the row's background color
  zIndex: 2, // Higher than regular cells but lower than header
  '&::after': {
    content: '""',
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: '#e0e0e0',
  }
}));

// Update StyledHeaderTableCell to have higher z-index
const StyledHeaderTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderBottom: '1px solid #e0e0e0',
  fontSize: '0.85rem',
  backgroundColor: '#ffffff', // Solid background for header
  fontWeight: 600,
  color: '#000000',
  position: 'sticky',
  top: 0,
  zIndex: 3, // Higher than the metric column
}));

// Add a new component for the top-left corner cell
const CornerHeaderCell = styled(StyledHeaderTableCell)(({ theme }) => ({
  left: 0,
  zIndex: 4, // Highest z-index to stay on top
  backgroundColor: '#ffffff',
}));

const TotalHeaderTableCell = styled(StyledHeaderTableCell)(({ theme }) => ({
  borderLeft: '1px solid #e0e0e0',
}));

const TotalTableCell = styled(StyledTableCell)(({ theme }) => ({
  borderLeft: '1px solid #e0e0e0',
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: '#ffffff',
  '&:last-child td, &:last-child th': {
    borderBottom: 0,
  },
  '&:hover': {
    backgroundColor: '#f0f7ff',
  },
}));

const TotalRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: '#f5f8fa',
  '& td': {
    fontWeight: 600,
    borderTop: '1px solid #e0e0e0',
    borderBottom: 'none',
  },
}));

const SectionHeaderRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: '#eef2f7',
  '& td': {
    fontWeight: 600,
    color: '#47709B',
    borderTop: '1px solid #d0d7e0',
    borderBottom: '1px solid #d0d7e0',
    padding: theme.spacing(0.8, 2),
  },
}));

const KeyMetricRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: '#2c5282', // Dark blue background
  '& td': {
    fontWeight: 600,
    color: '#ffffff', // White text
    borderTop: '1px solid #234876',
    borderBottom: '1px solid #234876',
    padding: theme.spacing(0.8, 2),
  },
  '& .MuiTypography-root': {
    color: '#ffffff', // Ensure all Typography elements are white
  },
}));

// Add a new styled component for the last row
const LastRow = styled(TableRow)(({ theme }) => ({
  position: 'sticky',
  bottom: 0,
  backgroundColor: '#2c5282', // Same as KeyMetricRow
  zIndex: 2, // Higher than regular rows but lower than headers
  '& td': {
    fontWeight: 600,
    color: '#ffffff',
    borderTop: '2px solid #234876', // Thicker border to separate from content
    borderBottom: 'none',
    padding: theme.spacing(0.8, 2),
  },
  '& .MuiTypography-root': {
    color: '#ffffff',
  },
}));

// Update the TotalTableCell to handle last row sticky positioning
const LastRowTotalTableCell = styled(TotalTableCell)(({ theme }) => ({
  position: 'sticky',
  right: 0,
  backgroundColor: '#2c5282',
  zIndex: 3, // Higher z-index for corner positioning
}));

// Update the StyledMetricTableCell for last row
const LastRowMetricTableCell = styled(StyledMetricTableCell)(({ theme }) => ({
  backgroundColor: '#2c5282',
  color: '#ffffff',
  zIndex: 3, // Higher z-index for corner positioning
}));

// Format currency for display
const formatCurrency = (amount: number | undefined, metricName?: string): string => {
  if (amount === undefined || amount === null || amount === 0) return '';
  
  // Don't add currency symbol for Sales Volume
  if (metricName === 'Sales Volume') {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
  
  if (amount < 0) {
    return '$(' + Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }) + ')';
  }

  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// Format percentage with 1 decimal place
const formatPercentage = (value: number | undefined): string => {
  if (value === undefined || value === null || value === 0) return '';
  return `${value.toFixed(1)}%`;
};

// Format date for display - updated to handle both single dates and week ranges
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  // Simply return the dateString directly to avoid timezone issues
  return dateString;
};

// Determine if a metric should be a section header
const isSectionHeader = (metricName: string): boolean => {
  const sectionHeaders = [
    'Total Revenue',
    'Total COGS',
    'Total Operating Expenses',
  ];
  return sectionHeaders.includes(metricName);
};

// Determine if a metric is a key financial metric that needs highlighted
const isKeyMetric = (metricName: string): boolean => {
  const keyMetrics = ['Gross Margin', 'Net Profit'];
  return keyMetrics.includes(metricName);
};

// Add a function to check if a metric is Sales Volume
const isSalesVolume = (metricName: string): boolean => {
  return metricName === 'Sales Volume';
};

const PnLReport: React.FC = () => {
  // Filter states
  const [portfolio, setPortfolio] = useState<string>('');
  const [product, setProduct] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Chart title state
  const [chartTitle, setChartTitle] = useState<string>('P&L Report');

  // Filter options
  const [portfolioOptions, setPortfolioOptions] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [skuOptions, setSkuOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // PnL report data
  const [pnlData, setPnlData] = useState<any>(null);
  const [loadingPnl, setLoadingPnl] = useState<boolean>(true);
  const [pnlError, setPnlError] = useState<string | null>(null);

  // State for download menu and dialog
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<null | HTMLElement>(null);
  const downloadMenuOpen = Boolean(downloadAnchorEl);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Format date as YYYY-MM-DD without timezone issues
  const formatDateForAPI = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return '';
    // Get local date parts to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoadingOptions(true);
        const response = await axios.get('/filters_all_brand_component_sku');
        if (response.data) {
          setPortfolioOptions(response.data.brands || []);
          setProductOptions(response.data.ir_items || []);
          setSkuOptions(response.data.skus || []);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchFilterOptions();
  }, []);

  // Fetch PnL report data
  useEffect(() => {
    const fetchPnLData = async () => {
      try {
        setLoadingPnl(true);
        setPnlError(null);
        
        // Build URL with parameters
        let url = '/pnl_report_data';
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append('startDate', formatDateForAPI(startDate));
        }
        
        if (endDate) {
          params.append('endDate', formatDateForAPI(endDate));
        }
        
        if (portfolio) params.append('portfolio', portfolio);
        if (product) params.append('product', product);
        if (sku) params.append('sku', sku);
        
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        
        const response = await axios.get(url);
        setPnlData(response.data);
      } catch (error: any) {
        console.error('Error loading PnL report data:', error);
        setPnlError('No data available based on the selected filters.');
      } finally {
        setLoadingPnl(false);
      }
    };

    fetchPnLData();
  }, [portfolio, product, sku, startDate, endDate]);

  // Generate report title based on filters
  const getReportTitle = (): string => {
    if (sku && startDate && endDate) {
      return `${sku} (${formatDateForAPI(startDate)} to ${formatDateForAPI(endDate)})`;
    } else if (sku) {
      return `${sku} (Full Period)`;
    } else if (startDate && endDate) {
      return `All SKU (${formatDateForAPI(startDate)} to ${formatDateForAPI(endDate)})`;
    }
    return 'All SKU Full Period';
  };
  
  // Handle downloads
  const handleDownloadClick = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadDialogOpen(true);
  };
  
  const handleDownloadClose = () => {
    setDownloadAnchorEl(null);
  };

  const handleDownloadDialogClose = () => {
    setDownloadDialogOpen(false);
    setSelectedSkus([]);
  };

  const handleSkuSelectionChange = (skuValue: string, checked: boolean) => {
    if (checked) {
      setSelectedSkus([...selectedSkus, skuValue]);
    } else {
      setSelectedSkus(selectedSkus.filter(s => s !== skuValue));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSkus(['All SKUs', ...skuOptions]);
    } else {
      setSelectedSkus([]);
    }
  };

  const isAllSelected = () => {
    return selectedSkus.length === skuOptions.length + 1; // +1 for "All SKUs"
  };

  const isIndeterminate = () => {
    return selectedSkus.length > 0 && selectedSkus.length < skuOptions.length + 1;
  };

  // Fetch data for specific SKU
  const fetchDataForSku = async (targetSku: string): Promise<any> => {
    try {
      let url = '/pnl_report_data';
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('startDate', formatDateForAPI(startDate));
      }
      
      if (endDate) {
        params.append('endDate', formatDateForAPI(endDate));
      }
      
      if (portfolio) params.append('portfolio', portfolio);
      if (product) params.append('product', product);
      if (targetSku !== 'All SKUs') {
        params.append('sku', targetSku);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching data for SKU ${targetSku}:`, error);
      return null;
    }
  };

  // Generate report title for specific SKU
  const getReportTitleForSku = (targetSku: string): string => {
    if (targetSku !== 'All SKUs' && startDate && endDate) {
      return `${targetSku} (${formatDateForAPI(startDate)} to ${formatDateForAPI(endDate)})`;
    } else if (targetSku !== 'All SKUs') {
      return `${targetSku} (Full Period)`;
    } else if (startDate && endDate) {
      return `All SKU (${formatDateForAPI(startDate)} to ${formatDateForAPI(endDate)})`;
    }
    return 'All SKU Full Period';
  };

  // Generate HTML for specific data
  const generateHTML = (data: any, title: string) => {
    if (!data) return '';
    
    // Generate HTML table with exact matching styling
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly P&L Report - ${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      background-color: #f5f8fa;
      color: #333;
      line-height: 1.5;
      font-size: 14px;
    }
    
    .report-container {
      width: 100%;
      max-width: none;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      padding: 0;
      height: calc(100vh - 100px);
      display: flex;
      flex-direction: column;
    }

    h1 {
      color: #47709B;
      font-weight: 600;
      font-size: 20px;
      margin: 24px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eaeff4;
      flex: 0 0 auto;
    }
    
    .table-wrapper {
      flex: 1 1 auto;
      overflow: auto;
      position: relative;
      margin-bottom: 16px;
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    }

    .table-wrapper::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    .table-wrapper::-webkit-scrollbar-track {
      background: transparent;
    }

    .table-wrapper::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }
    
    table {
      border-collapse: separate;
      border-spacing: 0;
      margin: 0;
      padding: 0;
      min-width: 100%;
      font-size: 0.85rem;
    }

    thead {
      position: sticky;
      top: 0;
      z-index: 2;
      background-color: #ffffff;
    }
    
    th {
      position: sticky;
      top: 0;
      background-color: #ffffff;
      font-weight: 600;
      color: #000000;
      border-bottom: 1px solid #e0e0e0;
      padding: 8px 16px;
      white-space: nowrap;
      height: 42px;
      font-size: 0.85rem;
      box-sizing: border-box;
      z-index: 2;
    }

    td {
      padding: 8px 16px;
      background-color: inherit;
      white-space: nowrap;
      height: 42px;
      font-size: 0.85rem;
      box-sizing: border-box;
      border-bottom: 1px solid #f0f0f0;
    }
    
    /* First column (metrics) */
    .metric-cell {
      position: sticky;
      left: 0;
      z-index: 1;
      text-align: left;
      padding-left: 24px;
      font-weight: 500;
      width: 220px;
      background-color: #ffffff;
    }

    /* Corner cell (top-left) */
    .corner-header {
      position: sticky;
      left: 0;
      z-index: 4;
      background-color: #ffffff;
    }

    /* Last column (totals) */
    .total-cell {
      position: sticky;
      right: 0;
      z-index: 1;
      border-left: 1px solid #e0e0e0;
      padding-right: 24px;
      background-color: #ffffff;
      font-weight: 500;
    }

    /* Total header (top-right) */
    .total-header {
      position: sticky;
      right: 0;
      z-index: 4;
      background-color: #ffffff;
      border-left: 1px solid #e0e0e0;
    }

    /* Section header rows */
    tr.section-header {
      background-color: #eef2f7;
    }

    tr.section-header td {
      font-weight: 600;
      color: #47709B;
      border-top: 1px solid #d0d7e0;
      border-bottom: 1px solid #d0d7e0;
    }

    tr.section-header .metric-cell,
    tr.section-header .total-cell {
      background-color: #eef2f7;
    }

    /* Key metric rows */
    tr.key-metric {
      background-color: #2c5282;
      color: #ffffff;
    }

    tr.key-metric td {
      font-weight: 600;
      border-top: 1px solid #234876;
      border-bottom: 1px solid #234876;
    }

    tr.key-metric .metric-cell,
    tr.key-metric .total-cell {
      background-color: #2c5282;
      color: #ffffff;
    }

    /* Add pseudo-elements for header cells to ensure clean borders */
    th::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      border-bottom: 1px solid #e0e0e0;
    }

    /* Ensure proper background for sticky cells in different row types */
    tr.section-header .metric-cell {
      background-color: #eef2f7;
      z-index: 1;
    }

    tr.section-header .total-cell {
      background-color: #eef2f7;
      z-index: 1;
    }

    tr.key-metric .metric-cell {
      background-color: #2c5282;
      z-index: 1;
    }

    tr.key-metric .total-cell {
      background-color: #2c5282;
      z-index: 1;
    }

    /* Cell content */
    .cell-content {
      display: flex;
      flex-direction: column;
      min-height: 35px;
      justify-content: center;
    }

    .value {
      font-weight: inherit;
      min-height: 20px;
      display: block;
    }

    .percentage {
      font-size: 0.78rem;
      color: #666;
      margin-top: 3px;
      min-height: 15px;
      display: block;
    }

    tr.section-header .percentage {
      font-weight: 600;
    }

    tr.key-metric .percentage {
      color: #ffffff;
      font-weight: 600;
    }

    /* Fix percentage color for last row */
    tr.last-row .percentage {
      color: #ffffff;
      font-weight: 600;
    }

    /* Regular cells */
    .data-cell {
      text-align: right;
      background-color: inherit;
      vertical-align: middle;
      z-index: 0;
    }

    tr:hover .data-cell {
      background-color: #f8fafc;
    }

    tr.section-header:hover .data-cell {
      background-color: #e8edf3;
    }

    tr.key-metric:hover .data-cell {
      background-color: #264973;
    }

    tr.last-row:hover .data-cell {
      background-color: #264973;
    }

    tr.last-row:hover .metric-cell {
      background-color: #264973;
    }

    tr.last-row:hover .total-cell {
      background-color: #264973;
    }

    /* Sales Volume specific styles */
    .sales-volume .cell-content {
      justify-content: center;
    }

    .sales-volume-value {
      min-height: 35px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    /* Last row (Net Profit) sticky positioning */
    .last-row {
      position: sticky;
      bottom: 0;
      background-color: #2c5282;
      color: #ffffff;
      z-index: 2;
    }

    .last-row td {
      font-weight: 600;
      border-top: 2px solid #234876;
      border-bottom: none;
      background-color: #2c5282;
      color: #ffffff;
    }

    .last-row .metric-cell {
      background-color: #2c5282;
      z-index: 3;
    }

    .last-row .total-cell {
      background-color: #2c5282;
      z-index: 3;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <h1>Weekly P&L Report - ${title}</h1>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="corner-header"></th>
            ${data.dates.map((date: string) => `<th class="data-cell">${date}</th>`).join('')}
            <th class="total-header">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.metrics.map((metric: string, index: number) => {
            const isLastRow = index === data.metrics.length - 1;
            const rowClass = isLastRow ? 'last-row' :
                           isSectionHeader(metric) ? 'section-header' : 
                           isKeyMetric(metric) ? 'key-metric' : '';
            const isSalesVolumeMetric = isSalesVolume(metric);
            
            return `
              <tr class="${rowClass}">
                <td class="metric-cell">${metric}</td>
                ${data.dates.map((date: string) => {
                  const value = data.data[date] ? data.data[date][index] : 0;
                  const percentage = data.percentage_of_revenue[date] ? data.percentage_of_revenue[date][index] : 0;
                  
                  return `
                    <td class="data-cell${isSalesVolumeMetric ? ' sales-volume' : ''}">
                      <div class="cell-content">
                        <span class="value${isSalesVolumeMetric ? ' sales-volume-value' : ''}">${formatCurrency(value, metric)}</span>
                        ${!isSalesVolumeMetric ? `
                          <span class="percentage">${formatPercentage(percentage)}</span>
                        ` : ''}
                      </div>
                    </td>
                  `;
                }).join('')}
                <td class="total-cell${isSalesVolumeMetric ? ' sales-volume' : ''}">
                  <div class="cell-content">
                    <span class="value${isSalesVolumeMetric ? ' sales-volume-value' : ''}">${formatCurrency(data.totals ? data.totals[index] : 0, metric)}</span>
                    ${!isSalesVolumeMetric ? `
                      <span class="percentage">${formatPercentage(data.totals_percentage_of_revenue ? data.totals_percentage_of_revenue[index] : 0)}</span>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
    
    return htmlContent;
  };

  // Generate CSV for specific data
  const generateCSV = (data: any, title: string) => {
    if (!data) return '';
    
    // CSV header row
    let csvContent = "Metrics,";
    
    // Add date columns to header with formatted dates
    data.dates.forEach((date: string) => {
      csvContent += `${date},`;
    });
    
    // Add total column to header
    csvContent += "Total\n";
    
    // Add rows
    data.metrics.forEach((metric: string, index: number) => {
      csvContent += `"${metric}",`;
      
      // Add values for each date
      data.dates.forEach((date: string) => {
        const value = data.data[date] ? data.data[date][index] : 0;
        
        // Format values appropriate for CSV
        let formattedValue = '';
        if (value !== 0) {
          if (metric === 'Sales Volume') {
            formattedValue = value.toString();
          } else {
            formattedValue = value < 0 
              ? `-${Math.abs(value).toFixed(2)}`
              : value.toFixed(2);
          }
        }
        
        csvContent += `${formattedValue},`;
      });
      
      // Add total
      const totalValue = data.totals ? data.totals[index] : 0;
      let formattedTotal = '';
      if (totalValue !== 0) {
        if (metric === 'Sales Volume') {
          formattedTotal = totalValue.toString();
        } else {
          formattedTotal = totalValue < 0 
            ? `-${Math.abs(totalValue).toFixed(2)}`
            : totalValue.toFixed(2);
        }
      }
      csvContent += `${formattedTotal}\n`;
    });
    
    return csvContent;
  };

  // Download file helper
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle batch download
  const handleBatchDownload = async () => {
    setIsDownloading(true);
    
    try {
      for (const selectedSku of selectedSkus) {
        const data = await fetchDataForSku(selectedSku);
        if (data) {
          const title = getReportTitleForSku(selectedSku);
          const safeTitle = title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
          
          // Generate and download HTML
          const htmlContent = generateHTML(data, title);
          downloadFile(htmlContent, `Weekly_PnL_Report_${safeTitle}.html`, 'text/html');
          
          // Generate and download CSV
          const csvContent = generateCSV(data, title);
          downloadFile(csvContent, `Weekly_PnL_Report_${safeTitle}.csv`, 'text/csv;charset=utf-8;');
          
          // Small delay between downloads to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error during batch download:', error);
    } finally {
      setIsDownloading(false);
      handleDownloadDialogClose();
    }
  };

  return (
    <Box 
      component="div"
      sx={{ 
        height: 'calc(100vh - 140px)', 
        width: '100%', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        margin: 0
      }}
    >
      <BentoGrid className="bento-grid">
        {/* Container 0: filter row, spans full width */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 7', 
            gridRow: 'span 1',
            minHeight: '90px',
          }}
        >
          <FilterCardContainer>
            <CardContent>
              {loadingOptions ? (
                <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    width: '100%',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      justifyContent: 'center',
                      gap: 2,
                      py: 1
                    }}
                  >
                    {/* Row 1: Portfolio, Product, SKU */}
                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                      }}
                    >
                      {/* Filter 1: Portfolio */}
                      <FilterContainer sx={{ flex: 1 }}>
                        <FilterLabel>Portfolio:</FilterLabel>
                        <Autocomplete
                          size="small"
                          options={portfolioOptions}
                          value={portfolio || null}
                          onChange={(event, newValue) => setPortfolio(newValue || '')}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="All Portfolios"
                              size="small"
                              variant="outlined"
                              InputProps={{
                                ...params.InputProps,
                                style: { fontSize: '0.85rem', padding: '0px' },
                              }}
                              sx={{
                                '& .MuiInputBase-root': {
                                  padding: '0px 14px 0px 0px',
                                },
                                '& .MuiOutlinedInput-input': {
                                  padding: '4px 14px',
                                },
                                '& .MuiInputBase-input::placeholder': {
                                  color: '#9e9e9e',
                                  opacity: 1,
                                },
                              }}
                            />
                          )}
                          sx={{ flex: 1, minWidth: 150 }}
                          freeSolo
                          selectOnFocus
                          clearOnBlur
                          handleHomeEndKeys
                          renderOption={(props, option) => (
                            <MenuItem {...props} sx={menuItemSx}>
                              {option}
                            </MenuItem>
                          )}
                        />
                      </FilterContainer>

                      {/* Filter 2: Product */}
                      <FilterContainer sx={{ flex: 1 }}>
                        <FilterLabel>Product:</FilterLabel>
                        <Autocomplete
                          size="small"
                          options={productOptions}
                          value={product || null}
                          onChange={(event, newValue) => setProduct(newValue || '')}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="All Products"
                              size="small"
                              variant="outlined"
                              InputProps={{
                                ...params.InputProps,
                                style: { fontSize: '0.85rem', padding: '0px' },
                              }}
                              sx={{
                                '& .MuiInputBase-root': {
                                  padding: '0px 14px 0px 0px',
                                },
                                '& .MuiOutlinedInput-input': {
                                  padding: '4px 14px',
                                },
                                '& .MuiInputBase-input::placeholder': {
                                  color: '#9e9e9e',
                                  opacity: 1,
                                },
                              }}
                            />
                          )}
                          sx={{ flex: 1, minWidth: 150 }}
                          freeSolo
                          selectOnFocus
                          clearOnBlur
                          handleHomeEndKeys
                          renderOption={(props, option) => (
                            <MenuItem {...props} sx={menuItemSx}>
                              {option}
                            </MenuItem>
                          )}
                        />
                      </FilterContainer>

                      {/* Filter 3: SKU */}
                      <FilterContainer sx={{ flex: 1 }}>
                        <FilterLabel>SKU:</FilterLabel>
                        <Autocomplete
                          size="small"
                          options={skuOptions}
                          value={sku || null}
                          onChange={(event, newValue) => setSku(newValue || '')}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="All SKUs"
                              size="small"
                              variant="outlined"
                              InputProps={{
                                ...params.InputProps,
                                style: { fontSize: '0.85rem', padding: '0px' },
                              }}
                              sx={{
                                '& .MuiInputBase-root': {
                                  padding: '0px 14px 0px 0px',
                                },
                                '& .MuiOutlinedInput-input': {
                                  padding: '4px 14px',
                                },
                                '& .MuiInputBase-input::placeholder': {
                                  color: '#9e9e9e',
                                  opacity: 1,
                                },
                              }}
                            />
                          )}
                          sx={{ flex: 1, minWidth: 150 }}
                          freeSolo
                          selectOnFocus
                          clearOnBlur
                          handleHomeEndKeys
                          renderOption={(props, option) => (
                            <MenuItem {...props} sx={menuItemSx}>
                              {option}
                            </MenuItem>
                          )}
                        />
                      </FilterContainer>
                    </Box>

                    {/* Row 2: Start Date, End Date */}
                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                      }}
                    >
                      {/* Filter 4: Start Date */}
                      <FilterContainer sx={{ flex: 1 }}>
                        <FilterLabel>Start Date:</FilterLabel>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            value={startDate}
                            onChange={(newDate) => setStartDate(newDate)}
                            format="yyyy-MM-dd"
                            slotProps={{
                              textField: {
                                size: 'small',
                                variant: 'outlined',
                                placeholder: 'YYYY-MM-DD',
                                inputProps: {
                                  style: { fontSize: '0.85rem', padding: '4px 14px' },
                                },
                                sx: {
                                  flex: 1,
                                  minWidth: 150,
                                  maxWidth: '100%',
                                  '& .MuiInputBase-input::placeholder': {
                                    color: '#9e9e9e',
                                    opacity: 1,
                                  },
                                },
                              },
                            }}
                          />
                        </LocalizationProvider>
                      </FilterContainer>

                      {/* Filter 5: End Date */}
                      <FilterContainer sx={{ flex: 1 }}>
                        <FilterLabel>End Date:</FilterLabel>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            value={endDate}
                            onChange={(newDate) => setEndDate(newDate)}
                            format="yyyy-MM-dd"
                            slotProps={{
                              textField: {
                                size: 'small',
                                variant: 'outlined',
                                placeholder: 'YYYY-MM-DD',
                                inputProps: {
                                  style: { fontSize: '0.85rem', padding: '4px 14px' },
                                },
                                sx: {
                                  flex: 1,
                                  minWidth: 150,
                                  maxWidth: '100%',
                                  '& .MuiInputBase-input::placeholder': {
                                    color: '#9e9e9e',
                                    opacity: 1,
                                  },
                                },
                              },
                            }}
                          />
                        </LocalizationProvider>
                      </FilterContainer>
                    </Box>
                  </Box>
                </Box>
              )}
            </CardContent>
          </FilterCardContainer>
        </BentoItem>

        {/* Container 1: Main content, spans the rest of the grid */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 7', 
            gridRow: 'span 15',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <CardContainer sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}>
            <CardTitle>
              Weekly {chartTitle}
              {pnlData && 
                <IconButton 
                  onClick={handleDownloadClick}
                  size="small"
                  sx={{ color: '#47709B' }}
                  aria-label="Download report"
                >
                  <DownloadIcon />
                </IconButton>
              }
            </CardTitle>
            <CardContent sx={{ 
              flex: 1,
              overflow: 'hidden',
              padding: '8px !important',
              '&:last-child': { pb: '8px !important' }
            }}>
              {loadingPnl ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : pnlError ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color='#999' align="center">
                    {pnlError}
                  </Typography>
                </Box>
              ) : pnlData ? (
                <Box sx={{ 
                  height: '100%',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <TableContainer 
                    component={Box} 
                    sx={{ 
                      flex: 1,
                      overflow: 'auto',
                      '& .MuiTable-root': {
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                      },
                      // Custom scrollbar styling
                      '&::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '4px',
                      },
                      // Firefox scrollbar styling
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent',
                    }}
                  >
                    <Table stickyHeader size="small" aria-label="P&L report table">
                      <TableHead>
                        <TableRow>
                          <CornerHeaderCell></CornerHeaderCell>
                          {pnlData.dates && pnlData.dates.map((date: string) => (
                            <StyledHeaderTableCell key={date} align="right">
                              {date}
                            </StyledHeaderTableCell>
                          ))}
                          <TotalHeaderTableCell align="right" sx={{ position: 'sticky', right: 0, zIndex: 3 }}>
                            Total
                          </TotalHeaderTableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pnlData.metrics && pnlData.metrics.map((metric: string, index: number) => {
                          // Check if this is the last row (Net Profit)
                          const isLastRow = index === pnlData.metrics.length - 1;
                          
                          // Determine row type based on metric
                          let RowComponent = StyledTableRow;
                          let MetricCellComponent = StyledMetricTableCell;
                          let TotalCellComponent = TotalTableCell;
                          
                          if (isLastRow) {
                            RowComponent = LastRow;
                            MetricCellComponent = LastRowMetricTableCell;
                            TotalCellComponent = LastRowTotalTableCell;
                          } else if (isSectionHeader(metric)) {
                            RowComponent = SectionHeaderRow;
                          } else if (isKeyMetric(metric)) {
                            RowComponent = KeyMetricRow;
                          }
                          
                          return (
                            <RowComponent key={metric}>
                              <MetricCellComponent 
                                sx={{ 
                                  color: isKeyMetric(metric) || isLastRow ? '#ffffff' : 'inherit',
                                  backgroundColor: isKeyMetric(metric) || isLastRow ? '#2c5282' : 
                                                 isSectionHeader(metric) ? '#eef2f7' : '#ffffff',
                                }}
                              >
                                {metric}
                              </MetricCellComponent>
                              {pnlData.dates && pnlData.dates.map((date: string) => {
                                const value = pnlData.data[date] ? pnlData.data[date][index] : 0;
                                const percentage = pnlData.percentage_of_revenue[date] ? pnlData.percentage_of_revenue[date][index] : 0;
                                
                                return (
                                  <StyledTableCell key={`${metric}-${date}`} align="right">
                                    <Box sx={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'flex-end',
                                      minHeight: '35px',
                                      justifyContent: 'center' // Center all content vertically
                                    }}>
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          fontWeight: isSectionHeader(metric) || isKeyMetric(metric) || isLastRow ? 600 : 400,
                                          color: isKeyMetric(metric) || isLastRow ? '#ffffff' : 'inherit',
                                          minHeight: isSalesVolume(metric) ? '35px' : '20px', // Full height for Sales Volume
                                          display: 'flex',
                                          alignItems: 'center', // Center text vertically
                                          marginTop: isSalesVolume(metric) ? 0 : 'initial',
                                          marginBottom: isSalesVolume(metric) ? 0 : 'initial'
                                        }}
                                      >
                                        {formatCurrency(value, metric)}
                                      </Typography>
                                      {!isSalesVolume(metric) && (
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: isKeyMetric(metric) || isLastRow ? '#ffffff' : '#666',
                                            fontWeight: isSectionHeader(metric) || isKeyMetric(metric) || isLastRow ? 600 : 400,
                                            minHeight: '15px',
                                            display: 'block'
                                          }}
                                        >
                                          {formatPercentage(percentage)}
                                        </Typography>
                                      )}
                                    </Box>
                                  </StyledTableCell>
                                );
                              })}
                              <TotalCellComponent 
                                align="right" 
                                sx={{ 
                                  position: isLastRow ? 'sticky' : 'sticky',
                                  right: 0,
                                  backgroundColor: isKeyMetric(metric) || isLastRow ? '#2c5282' : 
                                                 isSectionHeader(metric) ? '#eef2f7' : '#ffffff',
                                }}
                              >
                                <Box sx={{ 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  alignItems: 'flex-end',
                                  minHeight: '35px',
                                  justifyContent: 'center' // Center all content vertically
                                }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: isSectionHeader(metric) || isKeyMetric(metric) || isLastRow ? 600 : 500,
                                      color: isKeyMetric(metric) || isLastRow ? '#ffffff' : 'inherit',
                                      minHeight: isSalesVolume(metric) ? '35px' : '20px', // Full height for Sales Volume
                                      display: 'flex',
                                      alignItems: 'center', // Center text vertically
                                      marginTop: isSalesVolume(metric) ? 0 : 'initial',
                                      marginBottom: isSalesVolume(metric) ? 0 : 'initial'
                                    }}
                                  >
                                    {formatCurrency(pnlData.totals ? pnlData.totals[index] : 0, metric)}
                                  </Typography>
                                  {!isSalesVolume(metric) && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        color: isKeyMetric(metric) || isLastRow ? '#ffffff' : '#666',
                                        fontWeight: isSectionHeader(metric) || isKeyMetric(metric) || isLastRow ? 600 : 400,
                                        minHeight: '15px',
                                        display: 'block'
                                      }}
                                    >
                                      {formatPercentage(pnlData.totals_percentage_of_revenue ? pnlData.totals_percentage_of_revenue[index] : 0)}
                                    </Typography>
                                  )}
                                </Box>
                              </TotalCellComponent>
                            </RowComponent>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography align="center">No data available</Typography>
                </Box>
              )}
            </CardContent>
          </CardContainer>
        </BentoItem>
      </BentoGrid>

      {/* Download SKU Selection Dialog */}
      <Dialog 
        open={downloadDialogOpen} 
        onClose={handleDownloadDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select SKUs to Download</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Select which SKU reports you want to download. Both HTML and CSV files will be generated for each selection.
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isAllSelected()}
                  indeterminate={isIndeterminate()}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              }
              label="Select All"
              sx={{ fontWeight: 600, mb: 1 }}
            />
            <Divider sx={{ my: 1 }} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedSkus.includes('All SKUs')}
                  onChange={(e) => handleSkuSelectionChange('All SKUs', e.target.checked)}
                />
              }
              label="All SKUs"
            />
            {skuOptions.map((skuOption) => (
              <FormControlLabel
                key={skuOption}
                control={
                  <Checkbox
                    checked={selectedSkus.includes(skuOption)}
                    onChange={(e) => handleSkuSelectionChange(skuOption, e.target.checked)}
                  />
                }
                label={skuOption}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDownloadDialogClose} disabled={isDownloading}>
            Cancel
          </Button>
          <Button 
            onClick={handleBatchDownload} 
            variant="contained"
            disabled={selectedSkus.length === 0 || isDownloading}
            startIcon={isDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
          >
            {isDownloading ? 'Downloading...' : 'Confirm Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PnLReport; 