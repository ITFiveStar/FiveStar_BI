import React, { useState, useEffect } from 'react';
import { Box, Paper, styled, Typography, CircularProgress, RadioGroup, FormControlLabel, Radio, TextField, MenuItem, Autocomplete, Divider } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import axios from 'axios';
import { api } from '../../../services/api';
import OperatingExpenseBreakdownByBrand from '../../../components/Charts/OperatingExpense_by_Brand_breakdownChart';
import OperatingExpenseDetailedItems from '../../../components/Charts/OperatingExpense_DetailedItem_trendChart';

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

// Format currency for display
const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined) return '$0';
  
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
  if (value === undefined) return '0%';
  return `${value.toFixed(1)}%`;
};

const OperatingExpenseDetails: React.FC = () => {
  // Filter states
  const [brand, setBrand] = useState<string>('');
  const [ir, setIr] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<string>('month');
  const [dateUpTo, setDateUpTo] = useState<Date | null>(null);
  const [expenseItem, setExpenseItem] = useState<string>('advertisements');
  const [fullExpenseItem, setFullExpenseItem] = useState<string>('advertisements');

  // Chart title state
  const [chartTitle, setChartTitle] = useState<string>('Monthly Expense');

  // Expense item options for the dropdown
  const expenseItemOptions = [
    { value: 'advertisements', label: 'Advertisements' },
    { value: 'fba_fees', label: 'FBA Fees' },
    { value: 'service_fees', label: 'Service Fees' },
    { value: 'returns', label: 'Returns' }
  ];

  // Full expense item options for Container 5
  const fullExpenseItemOptions = [
    { value: 'commission', label: 'Commission' },
    { value: 'advertisements', label: 'Advertisements' },
    { value: 'promotions', label: 'Promotions' },
    { value: 'fba_fees', label: 'FBA Fees' },
    { value: 'fbm_fees', label: 'FBM Fees' },
    { value: 'fbm_shipping', label: 'FBM Shipping' },
    { value: 'service_fees', label: 'Service Fees' },
    { value: 'marketplace_facilitator_tax', label: 'MP Facilitator Tax' },
    { value: 'chargebacks', label: 'Chargebacks' },
    { value: 'returns', label: 'Returns' }
  ];

  // Filter options
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [irOptions, setIrOptions] = useState<string[]>([]);
  const [skuOptions, setSkuOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Operating expense summary data
  const [expenseSummary, setExpenseSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  // Expense item breakdown data
  const [expenseItemData, setExpenseItemData] = useState<any>(null);
  const [loadingExpenseItem, setLoadingExpenseItem] = useState<boolean>(true);
  const [expenseItemError, setExpenseItemError] = useState<string | null>(null);

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
        setChartTitle('Monthly Operating Expense Details');
      } else if (newDisplayMode === 'quarter') {
        setChartTitle('Quarterly Operating Expense Details');
      } else if (newDisplayMode === 'year') {
        setChartTitle('Yearly Operating Expense Details');
      }
    }
  };

  // Handle expense item change
  const handleExpenseItemChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setExpenseItem(newValue);
    setFullExpenseItem(newValue); // Sync fullExpenseItem with expenseItem
  };

  // Handle full expense item change
  const handleFullExpenseItemChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setFullExpenseItem(newValue);
    
    // Check if the new value exists in expenseItemOptions
    const exists = expenseItemOptions.some(option => option.value === newValue);
    if (exists) {
      // Sync expenseItem with fullExpenseItem
      setExpenseItem(newValue);
    }
  };

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

  // Update chart title when display mode changes
  useEffect(() => {
    if (displayMode === 'month') {
      setChartTitle('Monthly Expense');
    } else if (displayMode === 'quarter') {
      setChartTitle('Quarterly Expense');
    } else if (displayMode === 'year') {
      setChartTitle('Yearly Expense');
    }
  }, [displayMode]);

  // Fetch operating expense summary data
  useEffect(() => {
    const fetchExpenseSummary = async () => {
      try {
        setLoadingSummary(true);
        setSummaryError(null);
        
        // Build URL with parameters
        let url = '/operating_expenses_details_summary_card';
        const params = new URLSearchParams();
        
        if (dateUpTo) {
          params.append('dateUpTo', formatDateForAPI(dateUpTo));
        }
        
        if (brand) params.append('brand', brand);
        if (ir) params.append('ir', ir);
        if (sku) params.append('sku', sku);
        params.append('displayMode', displayMode);
        
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        
        const response = await axios.get(url);
        setExpenseSummary(response.data);
      } catch (error: any) {
        console.error('Error loading expense summary data:', error);
        setSummaryError('No data available based on the selected filters.');
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchExpenseSummary();
  }, [brand, ir, sku, displayMode, dateUpTo]);

  // Fetch expense item data
  useEffect(() => {
    const fetchExpenseItemData = async () => {
      try {
        setLoadingExpenseItem(true);
        setExpenseItemError(null);
        
        // Build URL with parameters
        let url = '/operating_expenses_items_breakdown_summary_card';
        const params = new URLSearchParams();
        
        if (dateUpTo) {
          params.append('dateUpTo', formatDateForAPI(dateUpTo));
        }
        
        if (brand) params.append('brand', brand);
        if (ir) params.append('ir', ir);
        if (sku) params.append('sku', sku);
        params.append('displayMode', displayMode);
        params.append('expenseItem', expenseItem);
        
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        
        const response = await axios.get(url);
        setExpenseItemData(response.data);
      } catch (error: any) {
        console.error('Error loading expense item data:', error);
        setExpenseItemError('No data available based on the selected filters.');
      } finally {
        setLoadingExpenseItem(false);
      }
    };

    fetchExpenseItemData();
  }, [brand, ir, sku, displayMode, dateUpTo, expenseItem]);

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
        {/* Container 0: filter row, spans first 4 columns */}
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

        {/* Container 0: filter row, spans 5th and 6th columns */}
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
                Expense
                {expenseSummary && 
                  <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {`${expenseSummary.period_str} as of ${expenseSummary.as_of_date}`}
                  </Typography>
                }
              </CardTitle>
              <CardContent>
                {loadingSummary ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : summaryError ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color='#999' align="left">
                      {summaryError}
                    </Typography>
                  </Box>
                ) : expenseSummary ? (
                  <Box sx={{ 
                    position: 'relative', 
                    height: '100%', 
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#333', textAlign: 'center', mt: 4 }}>
                        {formatCurrency(expenseSummary.total_operating_expenses)}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ color: '#666', textAlign: 'center' }}>
                        {formatPercentage(expenseSummary.total_operating_expense_percentage)}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1 }}>
                      {expenseSummary.operating_expenses_breakdown.values && 
                        Object.keys(expenseSummary.operating_expenses_breakdown.values).map((index, i) => {
                          const metricName = expenseSummary.operating_expenses_breakdown.metrics[index];
                          const value = expenseSummary.operating_expenses_breakdown.values[index];
                          const percentage = expenseSummary.operating_expenses_breakdown.percentage_of_revenue[index] * 100;
                          
                          // Format the metric name for display
                          let displayName = metricName.replace('operating_expenses_', '').replace(/_/g, ' ');
                          // Capitalize first letter of each word
                          displayName = displayName.split(' ').map((word: string): string => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ');
                          
                          // Special case renaming for specific metrics
                          if (metricName === 'operating_expenses_marketplace_facilitator_tax') {
                            displayName = 'MP Facilitator Tax';
                          } else if (metricName === 'operating_expenses_revenue_chargebacks') {
                            displayName = 'Chargebacks';
                          }
                          
                          return (
                            <Box 
                              key={metricName} 
                              sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                py: 1,
                                borderBottom: i < Object.keys(expenseSummary.operating_expenses_breakdown.values).length - 1 ? '1px solid #f0f0f0' : 'none'
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                                {displayName}
                              </Typography>
                              <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                                {formatCurrency(value)}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                                {formatPercentage(percentage)}
                              </Typography>
                            </Box>
                          );
                        })
                      }
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography align="center">No data available</Typography>
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
            gridColumn: '2 / 7', 
            gridRow: 'span 6', 
          }}
        >
          <CardContainer>
            <CardTitle>
              {chartTitle}
            </CardTitle>
            <CardContent>
              <OperatingExpenseBreakdownByBrand
                brand={brand}
                ir={ir}
                sku={sku}
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
            <CardContainer>
              <CardTitle>
                Specific Expense Item Breakdown
              </CardTitle>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <FilterContainer sx={{ flexDirection: 'row', alignItems: 'center', mt: 2 }}>
                    <FilterLabel sx={{ minWidth: '100px', mr: 1 }}>Expense Item:</FilterLabel>
                    <TextField
                      select
                      value={expenseItem}
                      onChange={handleExpenseItemChange}
                      variant="outlined"
                      size="small"
                      sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-input': { 
                          fontSize: '0.85rem',
                          padding: '4px 14px',
                        }
                      }}
                    >
                      {expenseItemOptions.map((option) => (
                        <MenuItem 
                          key={option.value} 
                          value={option.value}
                          sx={menuItemSx}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </FilterContainer>
                </Box>
                
                {loadingExpenseItem ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : expenseItemError ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color='#999' align="left">
                      {expenseItemError}
                    </Typography>
                  </Box>
                ) : expenseItemData ? (
                  <Box sx={{ 
                    position: 'relative', 
                    height: 'calc(100% - 60px)', 
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Display appropriate total based on the selected expense item */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#333', textAlign: 'center', mt: 2 }}>
                        {expenseItem === 'advertisements' && formatCurrency(expenseItemData.advertisements_total)}
                        {expenseItem === 'fba_fees' && formatCurrency(expenseItemData.FBA_fees_total)}
                        {expenseItem === 'service_fees' && formatCurrency(expenseItemData.service_fees_total)}
                        {expenseItem === 'returns' && formatCurrency(expenseItemData.returns_total)}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ color: '#666', textAlign: 'center' }}>
                        {expenseItem === 'advertisements' && formatPercentage(expenseItemData.advertisements_percentage)}
                        {expenseItem === 'fba_fees' && formatPercentage(expenseItemData.FBA_fees_percentage)}
                        {expenseItem === 'service_fees' && formatPercentage(expenseItemData.service_fees_percentage)}
                        {expenseItem === 'returns' && formatPercentage(expenseItemData.returns_percentage)}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1 }}>
                      {/* Advertisements breakdown */}
                      {expenseItem === 'advertisements' && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              Ad (Sales)
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.advertisement_sales)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.advertisement_sales_percentage)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              Ad (Non-Sales)
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.advertisement_non_sales)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.advertisement_non_sales_percentage)}
                            </Typography>
                          </Box>
                        </>
                      )}
                      
                      {/* FBA fees breakdown */}
                      {expenseItem === 'fba_fees' && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              FBA Fulfillment Fee
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.FBA_fulfillment_fee)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.FBA_fulfillment_fee_percentage)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              Inbound Transportation
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.FBA_inbound_transportation_fee)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.FBA_inbound_transportation_fee_percentage)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              Storage Fee
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.FBA_storage_fee)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.FBA_storage_fee_percentage)}
                            </Typography>
                          </Box>
                        </>
                      )}
                      
                      {/* Service fees breakdown */}
                      {expenseItem === 'service_fees' && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              Sales Tax Service
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.sales_tax_service_fee)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.sales_tax_service_fee_percentage)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              Digital Services
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.digital_services_fee)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.digital_services_fee_percentage)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              Subscription
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.subscription_fee)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.subscription_fee_percentage)}
                            </Typography>
                          </Box>
                        </>
                      )}
                      
                      {/* Returns breakdown */}
                      {expenseItem === 'returns' && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              Shipping & Gift Wrap
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.returns_shipping_gift_wrap)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.returns_shipping_gift_wrap_percentage)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              Tax
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.returns_tax)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.returns_tax_percentage)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, flex: 2 }}>
                              Refund Commission
                            </Typography>
                            <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                              {formatCurrency(expenseItemData.returns_refund_commission)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#666', flex: 1, textAlign: 'right' }}>
                              {formatPercentage(expenseItemData.returns_refund_commission_percentage)}
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography align="center">No data available</Typography>
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
              Specific Expense Item % of Revenue
            </CardTitle>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <FilterContainer sx={{ flexDirection: 'row', alignItems: 'center', mt: 2 }}>
                  <FilterLabel sx={{ minWidth: '100px', mr: 1 }}>Expense Item:</FilterLabel>
                  <TextField
                    select
                    value={fullExpenseItem}
                    onChange={handleFullExpenseItemChange}
                    variant="outlined"
                    size="small"
                    sx={{
                      flex: 1,
                      '& .MuiOutlinedInput-input': { 
                        fontSize: '0.85rem',
                        padding: '4px 14px',
                      }
                    }}
                  >
                    {fullExpenseItemOptions.map((option) => (
                      <MenuItem 
                        key={option.value} 
                        value={option.value}
                        sx={menuItemSx}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </FilterContainer>
              </Box>
              <Box sx={{ flexGrow: 1, height: 'calc(100% - 60px)' }}>
                <OperatingExpenseDetailedItems
                  brand={brand}
                  ir={ir}
                  sku={sku}
                  displayMode={displayMode}
                  dateUpTo={dateUpTo}
                  fullExpenseItem={fullExpenseItem}
                />
              </Box>
            </CardContent>
          </CardContainer>
        </BentoItem>
      </BentoGrid>
    </Box>
  );
};

export default OperatingExpenseDetails;
