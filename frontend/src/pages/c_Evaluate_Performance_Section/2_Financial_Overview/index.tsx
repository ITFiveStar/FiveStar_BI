import React, { useState, useEffect } from 'react';
import { Box, Paper, styled, Typography, Tooltip, CircularProgress, FormControl, Select, MenuItem, FormControlLabel, Radio, RadioGroup, Autocomplete, TextField } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import financialOverviewService, { SummaryCards_Revenue_GrossMargin_NetProfit } from '../../../services/financialOverviewService';
import FinancialPerformanceSummaryChart from '../../../components/Charts/FinancialPerformanceSummaryChart';
import MainComponentSalesPieChart from '../../../components/Charts/Main_Component_SKU_Sales_PieChart';
import MainComponentProfitabilityBarChart, { ChartDisplayMode } from '../../../components/Charts/Main_Component_SKU_Profitability_BarChart';
import AR_AP_StatementsClosing_SummaryChart from '../../../components/Charts/AR_AP_StatementsClosing_SummaryChart';
import axios from 'axios';
import { api } from '../../../services/api';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';

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

// Format currency for display
const formatCurrency = (amount: number | undefined): string => {
  // Handle -0 explicitly
  if (amount === undefined || Object.is(amount, -0)) return '$0';

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

// Format date to remove microseconds and make it more readable
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  
  // Remove microseconds and convert to more readable format
  const date = new Date(dateString.split('.')[0]);
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Tooltip content component
const TooltipContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  maxWidth: 320,
  fontSize: '0.85rem',
  '& > p': {
    margin: theme.spacing(0.5, 0)
  }
}));

const Divider = styled('hr')(({ theme }) => ({
  margin: theme.spacing(1, 0),
  border: 'none',
  borderTop: '1px solid rgba(255, 255, 255, 0.6)',
  width: '100%'
}));

const FootnoteText = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  // color: '#888',
  fontStyle: 'italic',
  marginTop: theme.spacing(1)
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

const FinancialOverview: React.FC = () => {
  const [summaryCards_Revenue_GrossMargin_NetProfit, setSummaryCards_Revenue_GrossMargin_NetProfit] = useState<SummaryCards_Revenue_GrossMargin_NetProfit | null>(null);
  const [loading, setLoading] = useState<{[key: string]: boolean}>({
    summaryCards_Revenue_GrossMargin_NetProfit: true,
    arApData: true,
    vendorAPData: true
  });
  const [error, setError] = useState<{[key: string]: string | null}>({
    summaryCards_Revenue_GrossMargin_NetProfit: null,
    arApData: null,
    vendorAPData: null
  });
  const [latestARAPValues, setLatestARAPValues] = useState<{
    AR_cumulative: number;
    AP_cumulative: number;
    date: string;
  } | null>(null);
  const [vendorAPData, setVendorAPData] = useState<{
    total_AP_to_vendor: number;
    total_AP_to_vendor_without_MMM: number;
  } | null>(null);

  // Format percentage with 1 decimal place
  const formatPercentage = (value: number | undefined): string => {
    if (value === undefined) return '0%';
    return `${value.toFixed(1)}%`;
  };

  // Filter states
  const [brand, setBrand] = useState<string>('');
  const [ir, setIr] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<string>('month');
  const [dateUpTo, setDateUpTo] = useState<Date | null>(null);
  
  // Chart title state
  const [chartTitle, setChartTitle] = useState<string>('Monthly Performance Summary');
  
  // Chart display mode for Container 3b
  const [chartDisplayMode, setChartDisplayMode] = useState<ChartDisplayMode>('top5');
  
  // Filter options
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [irOptions, setIrOptions] = useState<string[]>([]);
  const [skuOptions, setSkuOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Format date as YYYY-MM-DD without timezone issues
  const formatDateForAPI = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return '';
    // Get local date parts to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date change
  const handleDateChange = (newDate: Date | null) => {
    // Store the Date object directly
    setDateUpTo(newDate);
  };

  // Handle filter changes
  const handleFilterChange = (filterName: string) => (event: any) => {
    if (filterName === 'brand') {
      setBrand(event.target.value);
    } else if (filterName === 'ir') {
      setIr(event.target.value);
    } else if (filterName === 'sku') {
      setSku(event.target.value);
    } else if (filterName === 'displayMode') {
      const newDisplayMode = event.target.value;
      setDisplayMode(newDisplayMode);
      
      // Update chart title based on the display mode
      if (newDisplayMode === 'month') {
        setChartTitle('Monthly Performance Summary');
      } else if (newDisplayMode === 'quarter') {
        setChartTitle('Quarterly Performance Summary');
      } else if (newDisplayMode === 'year') {
        setChartTitle('Yearly Performance Summary');
      }
    }
  };

  // Dynamic styles that depend on state
  const getSelectStyles = (value: string) => ({
    ...selectSx,
    '& .MuiSelect-select.MuiSelect-select': {
      color: value ? '#000000' : '#9e9e9e'
    }
  });

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoadingOptions(true);
        const response = await api.get('/filters_all_brand_component_sku');
        if (response.data) {
          setBrandOptions(response.data.brands || []);
          setIrOptions(response.data.ir_items || []);
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

  useEffect(() => {
    // Function to fetch summary card data
    const fetchSummaryCardData = async () => {
      try {
        setLoading(prev => ({ ...prev, summaryCards_Revenue_GrossMargin_NetProfit: true }));
        setError(prev => ({ ...prev, summaryCards_Revenue_GrossMargin_NetProfit: null }));
        
        const data = await financialOverviewService.getSummaryCards_Revenue_GrossMargin_NetProfit({
          brand, ir, sku, displayMode, dateUpTo
        });
        
        setSummaryCards_Revenue_GrossMargin_NetProfit(data);
      } catch (error: any) {
        console.error('Error loading summary cards data:', error);
        setError(prev => ({ 
          ...prev, 
          summaryCards_Revenue_GrossMargin_NetProfit: 'No enough data available based on the selected filters.' 
        }));
      } finally {
        setLoading(prev => ({ ...prev, summaryCards_Revenue_GrossMargin_NetProfit: false }));
      }
    };

    // Function to fetch AR/AP data
    const fetchARAPData = async () => {
      try {
        setLoading(prev => ({ ...prev, arApData: true }));
        setError(prev => ({ ...prev, arApData: null }));
        
        // Build URL with params
        let url = '/summary_AR_AP_and_statements_closing_chart_data';
        const params = new URLSearchParams();
        
        if (dateUpTo) {
          const year = dateUpTo.getFullYear();
          const month = String(dateUpTo.getMonth() + 1).padStart(2, '0');
          const day = String(dateUpTo.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          params.append('dateUpTo', formattedDate);
        }
        
        if (brand) params.append('brand', brand);
        if (ir) params.append('ir', ir);
        if (sku) params.append('sku', sku);
        
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        
        const response = await api.get(url);
        setLatestARAPValues(response.data.latest_values);
      } catch (error: any) {
        console.error('Error loading AR/AP data:', error);
        setError(prev => ({ 
          ...prev, 
          arApData: 'No enough data available based on the selected filters.' 
        }));
      } finally {
        setLoading(prev => ({ ...prev, arApData: false }));
      }
    };

    fetchSummaryCardData();
    fetchARAPData();
  }, [brand, ir, sku, displayMode, dateUpTo]);

  // Update chart title when display mode changes
  useEffect(() => {
    if (displayMode === 'month') {
      setChartTitle('Monthly Performance Summary');
    } else if (displayMode === 'quarter') {
      setChartTitle('Quarterly Performance Summary');
    } else if (displayMode === 'year') {
      setChartTitle('Yearly Performance Summary');
    }
  }, [displayMode]);

  // Generate tooltip content for Revenue card
  const revenueTooltipContent = (
    <TooltipContent>
      <Typography variant="body2">
        {displayMode === 'month' ? 'MTD' : displayMode === 'quarter' ? 'QTD' : 'YTD'} 
        {dateUpTo ? 
          ' as of input date (PST/PDT)' : 
          ' as of latest order date (PST/PDT)'}:
      </Typography>
      <Typography variant="body2">
        {formatDate(summaryCards_Revenue_GrossMargin_NetProfit?.latest_date)}
      </Typography>
      <Divider />
      <Typography variant="body2">
        Paid Portion from Statement Deposits:
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.revenue_paid_portion)}
      </Typography>
      <Typography variant="body2">
        Unpaid Portion from Estimates:
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.revenue_unpaid_portion)}
      </Typography>
      <Divider />
      <Typography variant="body2">
        Sales Portion:
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.revenue_sales_portion)}
      </Typography>
      <Typography variant="body2">
        Returns Portion:
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.revenue_returns_portion)}
      </Typography>
      <Typography variant="body2">
        Others Portion:
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.revenue_other_portion)}
      </Typography>
      <Typography variant="body2">
        &nbsp;
      </Typography>
      <Divider />
      <Divider />
      <Divider />
      <Typography variant="body2">
        &nbsp;
      </Typography>
      <Typography variant="body2">
        {displayMode === 'month' 
          ? 'Last Month MTD as MoM Reference:'
          : displayMode === 'quarter'
          ? 'Last Quarter QTD as QoQ Reference:'
          : 'Last Year YTD as YoY Reference:'}
      </Typography>
      <Typography variant="body2">
        {formatDate(summaryCards_Revenue_GrossMargin_NetProfit?.period_to_period_reference_date)}
      </Typography>
      <Divider />
      <Typography variant="body2">
        {displayMode === 'month' 
          ? 'Last Month MTD Revenue:'
          : displayMode === 'quarter'
          ? 'Last Quarter QTD Revenue:'
          : 'Last Year YTD Revenue:'}
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.revenue_last_period)}
      </Typography>
      <Typography variant="body2">
        &nbsp;
      </Typography>
      <FootnoteText>
        Revenue includes "Sales Revenue" from principal, shipping, gift-wrap, taxes, "Returns Revenue" from refunded expenses, and "Other Revenue" from reimbursements, miscellaneous recharges, and adjusted fees.
      </FootnoteText>
    </TooltipContent>
  );

  // Generate tooltip content for Gross Margin card
  const grossMarginTooltipContent = (
    <TooltipContent>
      <Typography variant="body2">
        {displayMode === 'month' ? 'MTD' : displayMode === 'quarter' ? 'QTD' : 'YTD'} 
        {dateUpTo ? 
          ' as of input date (PST/PDT)' : 
          ' as of latest order date (PST/PDT)'}:
      </Typography>
      <Typography variant="body2">
        {formatDate(summaryCards_Revenue_GrossMargin_NetProfit?.latest_date)}
      </Typography>
      <Divider />
      <Typography variant="body2">
        COGS: 
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.cogs)}
      </Typography>
      <Typography variant="body2">
        &nbsp;
      </Typography>
      <Divider />
      <Divider />
      <Divider />
      <Typography variant="body2">
        &nbsp;
      </Typography>
      <Typography variant="body2">
        {displayMode === 'month' 
          ? 'Last Month MTD as MoM Reference:'
          : displayMode === 'quarter'
          ? 'Last Quarter QTD as QoQ Reference:'
          : 'Last Year YTD as YoY Reference:'}
      </Typography>
      <Typography variant="body2">
        {formatDate(summaryCards_Revenue_GrossMargin_NetProfit?.period_to_period_reference_date)}
      </Typography>
      <Divider />
      <Typography variant="body2">
        {displayMode === 'month' 
          ? 'Last Month MTD Gross Margin:'
          : displayMode === 'quarter'
          ? 'Last Quarter QTD Gross Margin:'
          : 'Last Year YTD Gross Margin:'}
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.gross_margin_last_period)}
      </Typography>
      <Typography variant="body2">
        {formatPercentage(summaryCards_Revenue_GrossMargin_NetProfit?.gross_margin_percentage_last_period)}
      </Typography>
      <Typography variant="body2">
        &nbsp;
      </Typography>
      <FootnoteText>
        Gross Margin is calculated by deducting Cost of Good Solds from Revenue.
      </FootnoteText>
    </TooltipContent>
  );

  // Generate tooltip content for Net Profit card
  const netProfitTooltipContent = (
    <TooltipContent>
      <Typography variant="body2">
        {displayMode === 'month' ? 'MTD' : displayMode === 'quarter' ? 'QTD' : 'YTD'} 
        {dateUpTo ? 
          ' as of input date (PST/PDT)' : 
          ' as of latest order date (PST/PDT)'}:
      </Typography>
      <Typography variant="body2">
        {formatDate(summaryCards_Revenue_GrossMargin_NetProfit?.latest_date)}
      </Typography>
      <Divider />
      <Typography variant="body2">
        Operating Expense:
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.operating_expenses)}
      </Typography>
      <Divider />
      <Typography variant="body2">
        Paid Portion from Statement Deposits:
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.operating_expenses_paid_portion)}
      </Typography>
      <Typography variant="body2">
        Unpaid Portion from Estimates:
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.operating_expenses_unpaid_portion)}
      </Typography>
      <Divider />
      <Typography variant="body2">
        Sales Portion:
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.operating_expenses_non_returns_portion)}
      </Typography>
      <Typography variant="body2">
        Returns Portion:
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.operating_expenses_returns_portion)}
      </Typography>
      <Typography variant="body2">
        &nbsp;
      </Typography>
      <Divider />
      <Divider />
      <Divider />
      <Typography variant="body2">
        &nbsp;
      </Typography>
      <Typography variant="body2">
        {displayMode === 'month' 
          ? 'Last Month MTD as MoM Reference:'
          : displayMode === 'quarter'
          ? 'Last Quarter QTD as QoQ Reference:'
          : 'Last Year YTD as YoY Reference:'}
      </Typography>
      <Typography variant="body2">
        {formatDate(summaryCards_Revenue_GrossMargin_NetProfit?.period_to_period_reference_date)}
      </Typography>
      <Divider />
      <Typography variant="body2">
        {displayMode === 'month' 
          ? 'Last Month MTD Net Profit:'
          : displayMode === 'quarter'
          ? 'Last Quarter QTD Net Profit:'
          : 'Last Year YTD Net Profit:'}
      </Typography>
      <Typography variant="body2">
        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.net_profit_last_period)}
      </Typography>
      <Typography variant="body2">
        {formatPercentage(summaryCards_Revenue_GrossMargin_NetProfit?.net_profit_percentage_last_period)}
      </Typography>
      <Typography variant="body2">
        &nbsp;
      </Typography>
      <FootnoteText>
        Net Profit is calculated by deducting Operating Expense from Gross Margin. Operating Expense includes promotion discounts, commission fees, marketing spends, and other fees occured from sales, as well as reversed revenue items (except for principal price) from returns.
      </FootnoteText>
    </TooltipContent>
  );

  // Add function to fetch vendor AP data
  useEffect(() => {
    // Function to fetch vendor AP data
    const fetchVendorAPData = async () => {
      try {
        setLoading(prev => ({ ...prev, vendorAPData: true }));
        setError(prev => ({ ...prev, vendorAPData: null }));
        
        // Build URL with parameters
        let url = '/summary_AP_vendor';
        const params = new URLSearchParams();
        
        if (dateUpTo) {
          params.append('dateUpTo', formatDateForAPI(dateUpTo));
        }
        
        if (brand) params.append('brand', brand);
        if (ir) params.append('ir', ir);
        
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        
        const response = await api.get(url);
        setVendorAPData(response.data);
      } catch (error: any) {
        console.error('Error loading vendor AP data:', error);
        setError(prev => ({ 
          ...prev, 
          vendorAPData: 'No data available based on the selected filters.' 
        }));
      } finally {
        setLoading(prev => ({ ...prev, vendorAPData: false }));
      }
    };

    fetchVendorAPData();
  }, [brand, ir, dateUpTo]);

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

        {/* Container 0: filter row, spans  */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 5', 
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
                    {/* Row 1: Brand and PC */}
                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                      }}
                    >
                      {/* Filter 1: Brand */}
                      <FilterContainer sx={{ flex: 1 }}>
                        <FilterLabel>Brand:</FilterLabel>
                        <Autocomplete
                          size="small"
                          options={brandOptions}
                          value={brand || null}
                          onChange={(event, newValue) => setBrand(newValue || '')}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="All Brands"
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

                      {/* Filter 2: PC */}
                      <FilterContainer sx={{ flex: 1 }}>
                        <FilterLabel>PC:</FilterLabel>
                        <Autocomplete
                          size="small"
                          options={irOptions}
                          value={ir || null}
                          onChange={(event, newValue) => setIr(newValue || '')}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="All PCs"
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

                    {/* Row 2: SKU */}
                    <Box sx={{ display: 'flex'  }}>
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
                          sx={{ flex: 1, minwidth: 350 }}
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
                  </Box>
                </Box>
              )}
            </CardContent>
          </FilterCardContainer>
        </BentoItem>

        {/* Container 0: filter row, spans  */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '5 / 7', 
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
                    {/* Row 1: Display Mode */}
                    <Box sx={{ display: 'flex', width: '100%' }}>
                      <FilterContainer sx={{ flex: 1 }}>
                        <FilterLabel>Display:</FilterLabel>
                        <RadioGroup
                          value={displayMode}
                          onChange={handleFilterChange('displayMode')}
                          sx={{ display: 'flex', flexDirection: 'row', width: '100%', ml: 5 }}
                        >
                          <FormControlLabel
                            value="month"
                            control={<Radio size="small" sx={{ paddingRight: '5px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px' }} />}
                            label={<Typography variant="subtitle2" sx={{ fontSize: '0.85rem' }}>By Month</Typography>}
                            sx={{ flex: 1, my: 0, mr: 1 }}
                          />
                          <FormControlLabel
                            value="quarter"
                            control={<Radio size="small" sx={{ paddingRight: '5px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px' }} />}
                            label={<Typography variant="subtitle2" sx={{ fontSize: '0.85rem' }}>By Quarter</Typography>}
                            sx={{ flex: 1, my: 0, mr: 1 }}
                          />
                          <FormControlLabel
                            value="year"
                            control={<Radio size="small" sx={{ paddingRight: '5px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px' }} />}
                            label={<Typography variant="subtitle2" sx={{ fontSize: '0.85rem' }}>By Year</Typography>}
                            sx={{ flex: 1, my: 0 }}
                          />
                        </RadioGroup>
                      </FilterContainer>
                    </Box>
                    
                    {/* Row 2: Date Up To */}
                    <Box sx={{ display: 'flex', width: '100%' }}>
                      <FilterContainer sx={{ flex: 1 }}>
                        <FilterLabel>Date Up To:</FilterLabel>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            value={dateUpTo}
                            onChange={handleDateChange}
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
                                  minWidth: 300,
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

        {/* Container 1: 1st column, spans top 60% after filter row */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 2', 
            gridRow: 'span 6', 
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            gap: theme => theme.spacing(2),
            padding: 0,
          }}>
            <CardContainer>
              <CardTitle>
                Revenue
                <Tooltip title={revenueTooltipContent} arrow placement="right">
                  <InfoOutlinedIcon fontSize="small" sx={{ cursor: 'help' }} />
                </Tooltip>
              </CardTitle>
              <CardContent>
                {loading.summaryCards_Revenue_GrossMargin_NetProfit ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : error.summaryCards_Revenue_GrossMargin_NetProfit ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color='#999' align="left">
                    {error.summaryCards_Revenue_GrossMargin_NetProfit}
                  </Typography>
                  </Box>
                ) : (
                  <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#333', textAlign: 'center', mt: 2}}>
                        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.revenue)}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ color: '#666', textAlign: 'center' }}>
                        &nbsp;
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      right: 8, 
                      fontSize: '0.9rem'
                    }}>
                      {summaryCards_Revenue_GrossMargin_NetProfit?.last_period_revenue_exist_flag ? (
                        summaryCards_Revenue_GrossMargin_NetProfit?.revenue_period_to_period_sign ? (
                        <span style={{ color: '#4fa58a', display: 'flex', alignItems: 'center' }}>
                          <ArrowDropUpIcon style={{ fontSize: '1.5rem', marginRight: '0px' }} />
                            {formatPercentage(summaryCards_Revenue_GrossMargin_NetProfit?.revenue_period_to_period_variance_percentage)} {displayMode === 'month' ? 'MoM' : displayMode === 'quarter' ? 'QoQ' : 'YoY'}
                        </span>
                      ) : (
                        <span style={{ color: 'red', display: 'flex', alignItems: 'center' }}>
                          <ArrowDropDownIcon style={{ fontSize: '1.5rem', marginRight: '0px' }} />
                            {formatPercentage(summaryCards_Revenue_GrossMargin_NetProfit?.revenue_period_to_period_variance_percentage)} {displayMode === 'month' ? 'MoM' : displayMode === 'quarter' ? 'QoQ' : 'YoY'}
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.75rem', fontStyle: 'italic' }}>
                          No Records Available for {displayMode === 'month' ? 'MoM' : displayMode === 'quarter' ? 'QoQ' : 'YoY'} Comparison
                        </span>
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </CardContainer>
            
            <CardContainer>
              <CardTitle>
                Gross Margin
                <Tooltip title={grossMarginTooltipContent} arrow placement="right">
                  <InfoOutlinedIcon fontSize="small" sx={{ cursor: 'help' }} />
                </Tooltip>
              </CardTitle>
              <CardContent>
                {loading.summaryCards_Revenue_GrossMargin_NetProfit ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : error.summaryCards_Revenue_GrossMargin_NetProfit ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color='#999' align="left">
                    {error.summaryCards_Revenue_GrossMargin_NetProfit}
                  </Typography>
                  </Box>
                ) : (
                  <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#333', textAlign: 'center', mt: 2 }}>
                        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.gross_margin)}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ color: '#666', textAlign: 'center' }}>
                        {formatPercentage(summaryCards_Revenue_GrossMargin_NetProfit?.gross_margin_percentage)}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      right: 8, 
                      fontSize: '0.9rem'
                    }}>
                      {summaryCards_Revenue_GrossMargin_NetProfit?.last_period_gross_margin_exist_flag ? (
                        summaryCards_Revenue_GrossMargin_NetProfit?.gross_margin_period_to_period_sign ? (
                        <span style={{ color: '#4fa58a', display: 'flex', alignItems: 'center' }}>
                          <ArrowDropUpIcon style={{ fontSize: '1.5rem', marginRight: '0px' }} />
                            {formatPercentage(summaryCards_Revenue_GrossMargin_NetProfit?.gross_margin_period_to_period_variance_percentage)} {displayMode === 'month' ? 'MoM' : displayMode === 'quarter' ? 'QoQ' : 'YoY'}
                        </span>
                      ) : (
                        <span style={{ color: 'red', display: 'flex', alignItems: 'center' }}>
                          <ArrowDropDownIcon style={{ fontSize: '1.5rem', marginRight: '0px' }} />
                            {formatPercentage(summaryCards_Revenue_GrossMargin_NetProfit?.gross_margin_period_to_period_variance_percentage)} {displayMode === 'month' ? 'MoM' : displayMode === 'quarter' ? 'QoQ' : 'YoY'}
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.75rem', fontStyle: 'italic' }}>
                          No Records Available for {displayMode === 'month' ? 'MoM' : displayMode === 'quarter' ? 'QoQ' : 'YoY'} Comparison
                        </span>
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </CardContainer>
            
            <CardContainer>
              <CardTitle>
                Net Profit
                <Tooltip title={netProfitTooltipContent} arrow placement="right">
                  <InfoOutlinedIcon fontSize="small" sx={{ cursor: 'help' }} />
                </Tooltip>
              </CardTitle>
              <CardContent>
                {loading.summaryCards_Revenue_GrossMargin_NetProfit ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : error.summaryCards_Revenue_GrossMargin_NetProfit ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color='#999' align="left">
                    {error.summaryCards_Revenue_GrossMargin_NetProfit}
                  </Typography>
                  </Box>
                ) : (
                  <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#333', textAlign: 'center', mt: 2 }}>
                        {formatCurrency(summaryCards_Revenue_GrossMargin_NetProfit?.net_profit)}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ color: '#666', textAlign: 'center' }}>
                        {formatPercentage(summaryCards_Revenue_GrossMargin_NetProfit?.net_profit_percentage)}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      right: 8, 
                      fontSize: '0.9rem'
                    }}>
                      {summaryCards_Revenue_GrossMargin_NetProfit?.last_period_net_profit_exist_flag ? (
                        summaryCards_Revenue_GrossMargin_NetProfit?.net_profit_period_to_period_sign ? (
                        <span style={{ color: '#4fa58a', display: 'flex', alignItems: 'center' }}>
                          <ArrowDropUpIcon style={{ fontSize: '1.5rem', marginRight: '0px' }} />
                            {formatPercentage(summaryCards_Revenue_GrossMargin_NetProfit?.net_profit_period_to_period_variance_percentage)} {displayMode === 'month' ? 'MoM' : displayMode === 'quarter' ? 'QoQ' : 'YoY'}
                        </span>
                      ) : (
                        <span style={{ color: 'red', display: 'flex', alignItems: 'center' }}>
                          <ArrowDropDownIcon style={{ fontSize: '1.5rem', marginRight: '0px' }} />
                            {formatPercentage(summaryCards_Revenue_GrossMargin_NetProfit?.net_profit_period_to_period_variance_percentage)} {displayMode === 'month' ? 'MoM' : displayMode === 'quarter' ? 'QoQ' : 'YoY'}
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#999', fontSize: '0.75rem', fontStyle: 'italic' }}>
                          No Records Available for {displayMode === 'month' ? 'MoM' : displayMode === 'quarter' ? 'QoQ' : 'YoY'} Comparison
                        </span>
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </CardContainer>
          </Box>
        </BentoItem>

        {/* Container 2: 2nd to 4th columns, spans top 60% after filter row */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '2 / 5', 
            gridRow: 'span 6', 
          }}
        >
          <CardContainer>
            <CardTitle>
              {chartTitle}
            </CardTitle>
            <CardContent>
              <FinancialPerformanceSummaryChart 
                brand={brand}
                ir={ir}
                sku={sku}
                displayMode={displayMode}
                dateUpTo={dateUpTo}
              />
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Container 3a: 5th to 6th columns, spans top 30% after filter row */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '5 / 7', 
            gridRow: 'span 3',
          }}
        >
          <CardContainer>
            <CardTitle>
              {displayMode === 'month' 
                ? 'MTD Top 5 Sales' 
                : displayMode === 'quarter' 
                  ? 'QTD Top 5 Sales'
                  : 'YTD Top 5 Sales'
              }
            </CardTitle>
            <CardContent>
              <MainComponentSalesPieChart 
                displayMode={displayMode}
                dateUpTo={dateUpTo}
              />
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Container 3b: 5th to 6th columns, spans 30-60% after filter row */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '5 / 7', 
            gridRow: 'span 3',
          }}
        >
          <CardContainer>
            <CardTitle>
              {chartDisplayMode === 'top5' 
                ? `${displayMode === 'month' ? 'MTD' : displayMode === 'quarter' ? 'QTD' : 'YTD'} Top 5 Profits` 
                : `${displayMode === 'month' ? 'MTD' : displayMode === 'quarter' ? 'QTD' : 'YTD'} Bottom 5 Profits`
              }
            </CardTitle>
            <CardContent>
              <MainComponentProfitabilityBarChart 
                onDisplayModeChange={setChartDisplayMode}
                displayMode={displayMode}
                dateUpTo={dateUpTo}
              />
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Container 4: 1st column, spans bottom 40% */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 2', 
            gridRow: 'span 4', 
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            gap: theme => theme.spacing(2),
            padding: 0
          }}>
            <CardContainer sx={{ height: 'calc(50% - 8px)' }}>
              <CardTitle>
                Outstanding - Amazon
              </CardTitle>
              <CardContent>{loading.arApData ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : error.arApData ? (
                    <Typography color='#999' align="left">
                      {error.arApData}
                    </Typography>
                  ) : (
                    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: '#333', textAlign: 'center', mt: 2 }}>
                          AR: {formatCurrency(latestARAPValues?.AR_cumulative)}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: '#333', textAlign: 'center', mt: 2 }}>
                          AP: {formatCurrency(latestARAPValues?.AP_cumulative)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
              </CardContent>
            </CardContainer>
            
            <CardContainer sx={{ height: 'calc(50% - 8px)' }}>
              <CardTitle>
                Outstanding - Vendor
              </CardTitle>
              <CardContent>
                {loading.vendorAPData ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : error.vendorAPData ? (
                  <Typography color='#999' align="left">
                    {error.vendorAPData}
                  </Typography>
                ) : (
                  <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#333', textAlign: 'center', mt: 2 }}>
                        AP: {formatCurrency(vendorAPData?.total_AP_to_vendor)}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ color: '#666', textAlign: 'center' }}>
                        Without MMM: {formatCurrency(vendorAPData?.total_AP_to_vendor_without_MMM)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </CardContainer>
          </Box>
        </BentoItem>

        {/* Container 5: 2nd to 6th columns, spans bottom 40% */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '2 / 7', 
            gridRow: 'span 4', 
          }}
        >
          <CardContainer>
            <CardTitle>
              Latest 120 Days AR AP Trend
            </CardTitle>
            <CardContent>
              <AR_AP_StatementsClosing_SummaryChart 
                dateUpTo={dateUpTo}
                brand={brand}
                ir={ir}
                sku={sku}
              />
            </CardContent>
          </CardContainer>
        </BentoItem>
      </BentoGrid>
    </Box>
  );
};

export default FinancialOverview; 