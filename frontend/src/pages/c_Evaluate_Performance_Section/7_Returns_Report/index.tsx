import React, { useState, useEffect } from 'react';
import { Box, Paper, styled, Typography, CircularProgress, TextField, MenuItem, Autocomplete, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Menu, ListItemIcon, ListItemText, MenuItem as MenuItemMUI } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import axios from 'axios';
import { api } from '../../../services/api';
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

const StyledMetricTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderBottom: '1px solid #f0f0f0',
  fontSize: '0.85rem',
  fontWeight: 500,
  width: '220px',
  height: '42px', // Set a consistent minimum height for all cells
  display: 'table-cell',
  verticalAlign: 'middle',
}));

const StyledHeaderTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderBottom: '1px solid #e0e0e0',
  fontSize: '0.85rem',
  backgroundColor: 'transparent',
  fontWeight: 600,
  color: '#000000',
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

// Format date for display
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

// Determine if a metric should be a section header
const isSectionHeader = (metricName: string): boolean => {
  const sectionHeaders = [
    'Order Related Profit',
    'Revenue Reversal and Returns Comission',
    'Returned Expenses'
  ];
  return sectionHeaders.includes(metricName);
};

// Determine if a metric is a key financial metric that needs highlighted
const isKeyMetric = (metricName: string): boolean => {
  const keyMetrics = ['Net Position from Returns'];
  return keyMetrics.includes(metricName);
};

// Add a function to check if a metric is Sales Volume
const isSalesVolume = (metricName: string): boolean => {
  return metricName === 'Sales Volume';
};

const ReturnsReport: React.FC = () => {
  // Filter states
  const [sku, setSku] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Chart title state
  const [chartTitle, setChartTitle] = useState<string>('Returns Report');

  // Filter options
  const [skuOptions, setSkuOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // PnL report data
  const [returnsData, setReturnsData] = useState<any>(null);
  const [loadingReturns, setLoadingReturns] = useState<boolean>(true);
  const [returnsError, setReturnsError] = useState<string | null>(null);

  // State for download menu
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<null | HTMLElement>(null);
  const downloadMenuOpen = Boolean(downloadAnchorEl);

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
        const response = await api.get('/filters_all_brand_component_sku');
        if (response.data) {
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
    const fetchReturnsData = async () => {
      try {
        setLoadingReturns(true);
        setReturnsError(null);
        
        // Build URL with parameters
        let url = '/returns_report_data';
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append('startDate', formatDateForAPI(startDate));
        }
        
        if (endDate) {
          params.append('endDate', formatDateForAPI(endDate));
        }
        
        if (sku) params.append('sku', sku);
        
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        
        const response = await axios.get(url);
        
        // Validate the response data structure before setting state
        if (
          response.data && 
          response.data.metrics && 
          response.data.dates && 
          response.data.data && 
          typeof response.data.data === 'object'
        ) {
          // Ensure the data property has entries for each date
          const validatedData = { ...response.data };
          
          // If percentage_of_revenue is missing, initialize it with empty objects
          if (!validatedData.percentage_of_revenue) {
            validatedData.percentage_of_revenue = {};
            
            // Create empty percentage data for each date with zeros
            validatedData.dates.forEach((date: string) => {
              validatedData.percentage_of_revenue[date] = Array(validatedData.metrics.length).fill(0);
            });
          }
          
          // Ensure each date in data has a corresponding array of values
          validatedData.dates.forEach((date: string) => {
            if (!validatedData.data[date]) {
              validatedData.data[date] = Array(validatedData.metrics.length).fill(0);
            }
            
            if (!validatedData.percentage_of_revenue[date]) {
              validatedData.percentage_of_revenue[date] = Array(validatedData.metrics.length).fill(0);
            }
          });
          
          // Ensure totals arrays exist
          if (!validatedData.totals) {
            validatedData.totals = Array(validatedData.metrics.length).fill(0);
          }
          
          if (!validatedData.totals_percentage_of_revenue) {
            validatedData.totals_percentage_of_revenue = Array(validatedData.metrics.length).fill(0);
          }
          
          setReturnsData(validatedData);
        } else {
          throw new Error('Invalid data structure received from the server');
        }
      } catch (error: any) {
        console.error('Error loading Returns report data:', error);
        setReturnsError('No data available based on the selected filters or there was an error processing the data.');
      } finally {
        setLoadingReturns(false);
      }
    };

    fetchReturnsData();
  }, [sku, startDate, endDate]);

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
    setDownloadAnchorEl(event.currentTarget);
  };
  
  const handleDownloadClose = () => {
    setDownloadAnchorEl(null);
  };
  
  // Generate and download HTML
  const downloadHTML = () => {
    if (!returnsData || !returnsData.dates || !returnsData.metrics || !returnsData.data) return;
    
    const title = getReportTitle();
    
    // Generate HTML table with exact matching styling
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Returns Report - ${title}</title>
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
        }
        
        .report-container {
          width: 100%;
          max-width: none;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          padding: 0;
          overflow-x: auto;
        }
        
        h1 {
          color: #47709B;
          font-weight: 600;
          font-size: 20px;
          margin-bottom: 24px;
          margin-left: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eaeff4;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        
        th, td {
          padding: 8px 16px;
          text-align: right;
          border-bottom: 1px solid #f0f0f0;
          vertical-align: middle;
          height: 42px; /* Consistent height for all cells */
        }
        
        th {
          font-weight: 600;
          color: #000000;
          border-bottom: 1px solid #e0e0e0;
          padding-top: 12px;
          padding-bottom: 12px;
          background-color: transparent;
        }
        
        th:first-child, td:first-child {
          text-align: left;
          padding-left: 24px;
          font-weight: 500;
          width: 220px;
        }
        
        th:last-child, td:last-child {
          border-left: 1px solid #e0e0e0;
          padding-right: 24px;
        }
        
        tr.section-header {
          background-color: #eef2f7;
        }
        
        tr.section-header td {
          font-weight: 600;
          color: #47709B;
          border-top: 1px solid #d0d7e0;
          border-bottom: 1px solid #d0d7e0;
          padding-top: 10px;
          padding-bottom: 10px;
        }
        
        tr.key-metric {
          background-color: #2c5282;
        }
        
        tr.key-metric td {
          color: white;
          font-weight: 600;
          border-top: 1px solid #234876;
          border-bottom: 1px solid #234876;
          padding-top: 10px;
          padding-bottom: 10px;
        }
        
        .value {
          font-weight: inherit;
          min-height: 35px; /* Ensure consistent height for all rows */
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        
        .cell-content {
          display: flex;
          flex-direction: column;
          justify-content: center; /* Center all content vertically */
          min-height: 35px; /* Ensure consistent cell content height */
        }
        
        .total-column {
          border-left: 1px solid #e0e0e0;
          font-weight: 500;
        }
        
        tr.section-header .total-column,
        tr.key-metric .total-column {
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <h1>Returns Report - ${title}</h1>
        <table>
          <thead>
            <tr>
              <th></th>
    `;
    
    // Add date columns
    returnsData.dates.forEach((date: string) => {
      htmlContent += `<th>${formatDate(date)}</th>`;
    });
    
    // Add total column
    htmlContent += `<th class="total-column">Total</th></tr></thead><tbody>`;
    
    // Add rows
    returnsData.metrics.forEach((metric: string, index: number) => {
      let rowClass = '';
      if (isSectionHeader(metric)) {
        rowClass = 'section-header';
      } else if (isKeyMetric(metric)) {
        rowClass = 'key-metric';
      }
      
      htmlContent += `<tr class="${rowClass}"><td>${metric}</td>`;
      
      // Add values for each date
      returnsData.dates.forEach((date: string) => {
        const value = returnsData.data[date] ? returnsData.data[date][index] : 0;
        
        htmlContent += '<td>';
        htmlContent += '<div class="cell-content">';
        if (value !== 0) {
          let valueStr = '';
          if (metric === 'Sales Volume') {
            valueStr = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          } else {
            valueStr = value < 0 
              ? `$(${ Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) })`
              : `$${ value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }`;
          }
          
          htmlContent += `<span class="value">${valueStr}</span>`;
        } else {
          htmlContent += '<span class="value"></span>';
        }
        htmlContent += '</div></td>';
      });
      
      // Add total
      const totalValue = returnsData.totals ? returnsData.totals[index] : 0;
      
      htmlContent += '<td class="total-column">';
      htmlContent += '<div class="cell-content">';
      if (totalValue !== 0) {
        let totalValueStr = '';
        if (metric === 'Sales Volume') {
          totalValueStr = totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
          totalValueStr = totalValue < 0 
            ? `$(${ Math.abs(totalValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) })`
            : `$${ totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }`;
        }
        
        htmlContent += `<span class="value">${totalValueStr}</span>`;
      } else {
        htmlContent += '<span class="value"></span>';
      }
      htmlContent += '</div></td></tr>';
    });
    
    htmlContent += `</tbody></table></div></body></html>`;
    
    // Create download link
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Returns_Report_${title.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    handleDownloadClose();
  };
  
  // Generate and download CSV
  const downloadCSV = () => {
    if (!returnsData || !returnsData.dates || !returnsData.metrics || !returnsData.data) return;
    
    const title = getReportTitle();
    
    // CSV header row
    let csvContent = "Metrics,";
    
    // Add date columns to header
    returnsData.dates.forEach((date: string) => {
      csvContent += `${formatDate(date)},`;
    });
    
    // Add total column to header
    csvContent += "Total\n";
    
    // Add rows
    returnsData.metrics.forEach((metric: string, index: number) => {
      csvContent += `"${metric}",`;
      
      // Add values for each date (no percentages in CSV)
      returnsData.dates.forEach((date: string) => {
        const value = returnsData.data[date] ? returnsData.data[date][index] : '';
        csvContent += `${value},`;
      });
      
      // Add total
      const totalValue = returnsData.totals ? returnsData.totals[index] : '';
      csvContent += `${totalValue}\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Returns_Report_${title.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    handleDownloadClose();
  };

  return (
    <Box sx={{ 
      height: 'calc(100vh - 140px)', 
      width: '100%', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: 0, // Remove padding
      margin: 0 // Remove margin
    }}>
      <BentoGrid className="bento-grid">
        {/* Container 0: filter row, spans full width */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 7', 
            gridRow: 'span 1', 
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
                      mt:1,
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      gap: 1
                    }}
                  >
                    {/* Row 1: SKU, Start Date, End Date */}
                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                      }}
                    >
                      {/* Filter 1: SKU */}
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

                      {/* Filter 2: Start Date */}
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

                      {/* Filter 3: End Date */}
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
          }}
        >
          <CardContainer>
            <CardTitle>
              {chartTitle}
              {returnsData && 
                <IconButton 
                  onClick={handleDownloadClick}
                  size="small"
                  sx={{ color: '#47709B' }}
                  aria-label="Download report"
                  aria-controls={downloadMenuOpen ? 'download-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={downloadMenuOpen ? 'true' : undefined}
                >
                  <DownloadIcon />
                </IconButton>
              }
              <Menu
                id="download-menu"
                anchorEl={downloadAnchorEl}
                open={downloadMenuOpen}
                onClose={handleDownloadClose}
                MenuListProps={{
                  'aria-labelledby': 'download-button',
                }}
              >
                <MenuItemMUI onClick={downloadHTML}>
                  <ListItemIcon>
                    <CodeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Download as HTML</ListItemText>
                </MenuItemMUI>
                <MenuItemMUI onClick={downloadCSV}>
                  <ListItemIcon>
                    <TableChartIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Download as CSV</ListItemText>
                </MenuItemMUI>
              </Menu>
            </CardTitle>
            <CardContent>
              {loadingReturns ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : returnsError ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color='#999' align="center">
                    {returnsError}
                  </Typography>
                </Box>
              ) : returnsData ? (
                <Box sx={{ height: '100%', overflow: 'auto', p: 1, width: '100%' }}>
                  <TableContainer component={Box} sx={{ maxHeight: '100%', overflowY: 'auto', width: '100%' }}>
                    <Table stickyHeader size="small" aria-label="P&L report table">
                      <TableHead>
                        <TableRow>
                          <StyledHeaderTableCell></StyledHeaderTableCell>
                          {returnsData.dates && returnsData.dates.map((date: string) => (
                            <StyledHeaderTableCell key={date} align="right">
                              {formatDate(date)}
                            </StyledHeaderTableCell>
                          ))}
                          <TotalHeaderTableCell align="right">Total</TotalHeaderTableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {returnsData.metrics && returnsData.metrics.map((metric: string, index: number) => {
                          // Determine row type based on metric
                          let RowComponent = StyledTableRow;
                          if (isSectionHeader(metric)) {
                            RowComponent = SectionHeaderRow;
                          } else if (isKeyMetric(metric)) {
                            RowComponent = KeyMetricRow;
                          }
                          
                          return (
                            <RowComponent key={metric}>
                              <StyledMetricTableCell sx={{ color: isKeyMetric(metric) ? '#ffffff' : 'inherit' }}>{metric}</StyledMetricTableCell>
                              {returnsData.dates && returnsData.dates.map((date: string) => {
                                // Add null checks for data access
                                const dataForDate = returnsData.data && returnsData.data[date] ? returnsData.data[date] : null;
                                const value = dataForDate && dataForDate[index] !== undefined ? dataForDate[index] : 0;
                                
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
                                          fontWeight: isSectionHeader(metric) || isKeyMetric(metric) ? 600 : 400,
                                          color: isKeyMetric(metric) ? '#ffffff' : 'inherit',
                                          minHeight: '35px', // Full height for all rows
                                          display: 'flex',
                                          alignItems: 'center', // Center text vertically
                                        }}
                                      >
                                        {formatCurrency(value, metric)}
                                      </Typography>
                                    </Box>
                                  </StyledTableCell>
                                );
                              })}
                              <TotalTableCell align="right">
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
                                      fontWeight: isSectionHeader(metric) || isKeyMetric(metric) ? 600 : 500,
                                      color: isKeyMetric(metric) ? '#ffffff' : 'inherit',
                                      minHeight: '35px', // Full height for all rows
                                      display: 'flex',
                                      alignItems: 'center', // Center text vertically
                                    }}
                                  >
                                    {formatCurrency(returnsData.totals && returnsData.totals[index] !== undefined 
                                      ? returnsData.totals[index] 
                                      : 0, metric)}
                                  </Typography>
                                </Box>
                              </TotalTableCell>
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
    </Box>
  );
};

export default ReturnsReport; 