import React, { useState, useEffect } from 'react';
import { Box, Paper, styled, Typography, CircularProgress, TextField, Divider, Autocomplete, MenuItem, FormControlLabel, Radio, RadioGroup, InputAdornment, FormLabel } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import axios from 'axios';
import RevenueForecastLineChart from '../../../components/Charts/Revenue_Forecast_LineChart';
import RevenueForecastTable from '../../../components/Tables/RevenueForecastTable';

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

// Card components
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
  flexGrow: 1,
  position: 'relative', // Add position relative to create positioning context
  minHeight: '80px', // Ensure minimum height for content
}));

// Styled filter components
const FilterContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
  display: 'flex',
  alignItems: 'center',
}));

const FilterLabel = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.9rem',
  color: '#555',
  width: '90px', // Fixed width for alignment
  flexShrink: 0
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
    // Format negative numbers with parentheses: $(12,345)
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

const RevenueStrategy: React.FC = () => {
  // Filter states
  const [filters, setFilters] = useState({
    brand: '',
    ir: '',
    sku: '',
    dateUpTo: null as Date | null // Store as Date object instead of string
  });
  
  // Scenario 1 filter states
  const [scenario1Filters, setScenario1Filters] = useState({
    revenueMethod: 'benchmark' as 'benchmark' | 'target_revenue' | 'flat_growth', // properly typed
    revenueTarget: '',
    revenueGrowthRate: '',
    dsiPeriod: '30' as '30' | '60' | '90', // properly typed
    dsiMethod: 'benchmark' as 'benchmark' | 'target_DSI' | 'flat_change', // properly typed
    dsiTarget: '',
    dsiChangeRate: ''
  });
  
  // Scenario 2 filter states
  const [scenario2Filters, setScenario2Filters] = useState({
    revenueMethod: 'benchmark' as 'benchmark' | 'target_revenue' | 'flat_growth', // properly typed
    revenueTarget: '',
    revenueGrowthRate: '',
    dsiPeriod: '30' as '30' | '60' | '90', // properly typed
    dsiMethod: 'benchmark' as 'benchmark' | 'target_DSI' | 'flat_change', // properly typed
    dsiTarget: '',
    dsiChangeRate: ''
  });
  
  // Available filter options
  const [filterOptions, setFilterOptions] = useState<{
    brands: string[];
    ir_items: string[];
    skus: string[];
  }>({
    brands: [],
    ir_items: [],
    skus: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for search text in the dropdowns
  const [brandSearch, setBrandSearch] = useState('');
  const [irSearch, setIrSearch] = useState('');
  const [skuSearch, setSkuSearch] = useState('');

  // Handlers for Scenario 1 filters
  const handleScenario1Change = (filterName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setScenario1Filters({
      ...scenario1Filters,
      [filterName]: event.target.value
    });
  };

  // Handlers for Scenario 2 filters
  const handleScenario2Change = (filterName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setScenario2Filters({
      ...scenario2Filters,
      [filterName]: event.target.value
    });
  };

  // Fetch filter options from the backend
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/filters_all_brand_component_sku');
        setFilterOptions({
          brands: response.data.brands || [],
          ir_items: response.data.ir_items || [],
          skus: response.data.skus || []
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching filter options:', err);
        setError('Failed to load filter options');
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  // Handle filter changes
  const handleFilterChange = (filterName: string) => (event: any) => {
    setFilters({
      ...filters,
      [filterName]: event.target.value
    });
  };

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
    setFilters({
      ...filters,
      dateUpTo: newDate
    });
  };

  // Dynamic styles that depend on state
  const getSelectStyles = (value: string) => ({
    ...selectSx,
    '& .MuiSelect-select.MuiSelect-select': {
      color: value ? '#000000' : '#9e9e9e'
    }
  });

  // Add useEffect to fetch data based on filters
  useEffect(() => {
    const fetchScenario1Data = async () => {
      try {
        // Build query params
        const params = new URLSearchParams();
        
        // Global filters
        if (filters.dateUpTo) params.append('dateUpTo', formatDateForAPI(filters.dateUpTo));
        if (filters.brand) params.append('brand', filters.brand);
        if (filters.ir) params.append('ir', filters.ir);
        if (filters.sku) params.append('sku', filters.sku);
        
        // Scenario 1 specific filters
        params.append('forecast_revenue_method', scenario1Filters.revenueMethod);
        params.append('DSI_period_in_days', scenario1Filters.dsiPeriod);
        params.append('forecast_DSI_method', scenario1Filters.dsiMethod);
        
        // Conditional params based on method selection
        if (scenario1Filters.revenueMethod === 'target_revenue' && scenario1Filters.revenueTarget) {
          params.append('year_end_total_revenue_target', scenario1Filters.revenueTarget);
        }
        
        if (scenario1Filters.revenueMethod === 'flat_growth' && scenario1Filters.revenueGrowthRate) {
          params.append('input_growth_rate', scenario1Filters.revenueGrowthRate);
        }
        
        if (scenario1Filters.dsiMethod === 'target_DSI' && scenario1Filters.dsiTarget) {
          params.append('year_end_DSI_target', scenario1Filters.dsiTarget);
        }
        
        if (scenario1Filters.dsiMethod === 'flat_change' && scenario1Filters.dsiChangeRate) {
          params.append('input_DSI_change_rate', scenario1Filters.dsiChangeRate);
        }
        
        // Scenario identifier
        params.append('scenario', '1');
        
        // Fetch data
        const response = await axios.get(`/evaluate_strategy/revenue_oriented_forecast_line_table_data?${params.toString()}`);
        
        // Process response data
        console.log('Scenario 1 data:', response.data);
        
        // Update state with response data
        // setScenario1Data(response.data);
        
      } catch (error) {
        console.error('Error fetching scenario 1 data:', error);
      }
    };
    
    const fetchScenario2Data = async () => {
      try {
        // Build query params
        const params = new URLSearchParams();
        
        // Global filters
        if (filters.dateUpTo) params.append('dateUpTo', formatDateForAPI(filters.dateUpTo));
        if (filters.brand) params.append('brand', filters.brand);
        if (filters.ir) params.append('ir', filters.ir);
        if (filters.sku) params.append('sku', filters.sku);
        
        // Scenario 2 specific filters
        params.append('forecast_revenue_method', scenario2Filters.revenueMethod);
        params.append('DSI_period_in_days', scenario2Filters.dsiPeriod);
        params.append('forecast_DSI_method', scenario2Filters.dsiMethod);
        
        // Conditional params based on method selection
        if (scenario2Filters.revenueMethod === 'target_revenue' && scenario2Filters.revenueTarget) {
          params.append('year_end_total_revenue_target', scenario2Filters.revenueTarget);
        }
        
        if (scenario2Filters.revenueMethod === 'flat_growth' && scenario2Filters.revenueGrowthRate) {
          params.append('input_growth_rate', scenario2Filters.revenueGrowthRate);
        }
        
        if (scenario2Filters.dsiMethod === 'target_DSI' && scenario2Filters.dsiTarget) {
          params.append('year_end_DSI_target', scenario2Filters.dsiTarget);
        }
        
        if (scenario2Filters.dsiMethod === 'flat_change' && scenario2Filters.dsiChangeRate) {
          params.append('input_DSI_change_rate', scenario2Filters.dsiChangeRate);
        }
        
        // Scenario identifier
        params.append('scenario', '2');
        
        // Fetch data
        const response = await axios.get(`/evaluate_strategy/revenue_oriented_forecast_line_table_data?${params.toString()}`);
        
        // Process response data
        console.log('Scenario 2 data:', response.data);
        
        // Update state with response data
        // setScenario2Data(response.data);
        
      } catch (error) {
        console.error('Error fetching scenario 2 data:', error);
      }
    };
    
    // Fetch data when filters change
    if (!loading) {
      fetchScenario1Data();
      fetchScenario2Data();
    }
    
  }, [
    filters, 
    scenario1Filters, 
    scenario2Filters, 
    loading
  ]);

  return (
    <Box sx={{ 
    height: 'calc(100vh - 140px)', 
    width: '100%', 
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    margin: 0
    }}>
    <BentoGrid className="bento-grid">
        {/* Container 0: spans all 1-6 columns, spans rows 1-2 */}
        <BentoItem 
        className="bento-item"
        sx={{ 
            gridColumn: '1 / 7', 
            gridRow: '1 / 2', // Span first 3 rows
        }}
        >
        <FilterCardContainer sx={{overflow: 'hidden'}}>
            <CardContent sx={{p:0, mt:0, mb:0, overflow: 'hidden'}}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={24} />
                    </Box>
                ) : error ? (
                    <Typography color="error" align="center">
                    {error}
                    </Typography>
                ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        width: '100%',
                      }}
                    >
                      <Box
                        sx={{
                          mt:0.6,
                          mb:0,
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          gap: 1,
                        }}
                      >
                        {/* Row 1: Brand and PC */}
                        <Box sx={{display: 'flex', gap: 6}}>
                          {/* Filter 1: Brand */}
                          <FilterContainer sx={{ flex: 1, mb: 0 }}>
                            <FilterLabel>Brand:</FilterLabel>
                            <Autocomplete
                              size="small"
                              options={filterOptions.brands}
                              value={filters.brand || null}
                              onChange={(event, newValue) => {
                                setFilters({
                                  ...filters,
                                  brand: newValue || ''
                                });
                              }}
                              onInputChange={(event, newInputValue) => {
                                setBrandSearch(newInputValue);
                              }}
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
                          <FilterContainer sx={{ flex: 1, mb: 0 }}>
                            <FilterLabel>PC:</FilterLabel>
                            <Autocomplete
                              size="small"
                              options={filterOptions.ir_items}
                              value={filters.ir || null}
                              onChange={(event, newValue) => {
                                setFilters({
                                  ...filters,
                                  ir: newValue || ''
                                });
                              }}
                              onInputChange={(event, newInputValue) => {
                                setIrSearch(newInputValue);
                              }}
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

                        {/* Row 2: SKU and Date Up To */}
                        <Box sx={{ display: 'flex', gap: 6}}>
                          {/* Filter 3: SKU */}
                          <FilterContainer sx={{ flex: 1, mb: 0 }}>
                            <FilterLabel>SKU:</FilterLabel>
                            <Autocomplete
                              size="small"
                              options={filterOptions.skus}
                              value={filters.sku || null}
                              onChange={(event, newValue) => {
                                setFilters({
                                  ...filters,
                                  sku: newValue || ''
                                });
                              }}
                              onInputChange={(event, newInputValue) => {
                                setSkuSearch(newInputValue);
                              }}
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

                          {/* Filter 4: Date Up To */}
                          <FilterContainer sx={{ flex: 1, mb: 0 }}>
                            <FilterLabel>Date Up To:</FilterLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                              <DatePicker
                                value={filters.dateUpTo}
                                onChange={handleDateChange}
                                format="yyyy-MM-dd"
                                slotProps={{
                                  textField: {
                                    size: "small",
                                    variant: "outlined",
                                    placeholder: 'YYYY-MM-DD',
                                    inputProps: {
                                      style: { fontSize: '0.85rem', padding: '4px 14px' }
                                    },
                                    sx: { 
                                      flex: 1,
                                      minWidth: 150,
                                      maxWidth: '100%',
                                      '& .MuiInputBase-input::placeholder': {
                                        color: '#9e9e9e',
                                        opacity: 1
                                      },
                                      '& input': {
                                        '&::placeholder': {
                                          color: '#9e9e9e',
                                          opacity: 1
                                        }
                                      }
                                    }
                                  }
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
        
        {/* Container 1: spans columns 1-3, rows 2-4 */}
        <BentoItem 
        className="bento-item"
        sx={{ 
            gridColumn: '1 / 4', 
            gridRow: '2 / 4', 
        }}
        >
            <CardContainer sx={{overflow: 'hidden'}}>
                <CardTitle>
                Scenario 1 Assumptions
                </CardTitle>
                <CardContent sx={{mb:0}}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0 }}>
                        {/* Grid layout for filter rows */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 0}}>
                            {/* Row 1: Revenue Forecast Method */}
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, alignSelf: 'center' }}>
                                Revenue Forecast Method:
                            </Typography>
                            <RadioGroup
                                row
                                value={scenario1Filters.revenueMethod}
                                onChange={handleScenario1Change('revenueMethod')}
                                sx={{ 
                                justifyContent: 'space-between', 
                                width: '100%',
                                '& .MuiFormControlLabel-root': {
                                    margin: 0
                                },
                                }}
                            >
                                <FormControlLabel 
                                value="benchmark" 
                                control={<Radio size="small" />} 
                                label={<Typography variant="body2">Benchmark</Typography>} 
                                />
                                <FormControlLabel 
                                value="target_revenue" 
                                control={<Radio size="small" />} 
                                label={<Typography variant="body2">Target</Typography>} 
                                />
                                <FormControlLabel 
                                value="flat_growth" 
                                control={<Radio size="small" />} 
                                label={<Typography variant="body2">Flat Growth&nbsp;</Typography>} 
                                />
                            </RadioGroup>
                            <Box sx={{ ml:3, alignSelf: 'center'}}>
                                {scenario1Filters.revenueMethod === 'target_revenue' && (
                                <TextField
                                    size="small"
                                    value={scenario1Filters.revenueTarget}
                                    onChange={handleScenario1Change('revenueTarget')}
                                    placeholder="Enter target revenue"
                                    type="number"
                                    InputProps={{
                                    startAdornment: <InputAdornment position="start"><Typography variant="body2">$</Typography></InputAdornment>,
                                    sx: { height: '28px', fontSize: '0.875rem' }
                                    }}
                                    sx={{ 
                                    width: '100%',
                                    '& input': { 
                                        fontSize: '0.875rem' 
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: '0.875rem'
                                    }
                                    }}
                                />
                                )}
                                {scenario1Filters.revenueMethod === 'flat_growth' && (
                                <TextField
                                    size="small"
                                    value={scenario1Filters.revenueGrowthRate}
                                    onChange={handleScenario1Change('revenueGrowthRate')}
                                    placeholder="Enter growth rate"
                                    type="number"
                                    InputProps={{
                                    endAdornment: <InputAdornment position="end"><Typography variant="body2">%</Typography></InputAdornment>,
                                    sx: { height: '28px', fontSize: '0.875rem' }
                                    }}
                                    sx={{ 
                                    width: '100%',
                                    '& input': { 
                                        fontSize: '0.875rem' 
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: '0.875rem'
                                    }
                                    }}
                                />
                                )}
                                {scenario1Filters.revenueMethod === 'benchmark' && (
                                <TextField
                                    size="small"
                                    disabled
                                    placeholder="Using benchmark"
                                    InputProps={{
                                    sx: { height: '28px', fontSize: '0.875rem' }
                                    }}
                                    sx={{ 
                                    width: '100%',
                                    '& input': { 
                                        fontSize: '0.875rem' 
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: '0.875rem'
                                    }
                                    }}
                                />
                                )}
                            </Box>

                            {/* Row 2: DSI Period */}
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, alignSelf: 'center' }}>
                                DSI Period:
                            </Typography>
                            <RadioGroup
                                row
                                value={scenario1Filters.dsiPeriod}
                                onChange={handleScenario1Change('dsiPeriod')}
                                sx={{ 
                                justifyContent: 'space-between', 
                                width: '100%',
                                '& .MuiFormControlLabel-root': {
                                    margin: 0
                                }
                                }}
                            >
                                <FormControlLabel 
                                value="30" 
                                control={<Radio size="small" />} 
                                label={<Typography variant="body2">30 days&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Typography>} 
                                />
                                <FormControlLabel 
                                value="60" 
                                control={<Radio size="small" />} 
                                label={<Typography variant="body2">60 days</Typography>} 
                                />
                                <FormControlLabel 
                                value="90" 
                                control={<Radio size="small" />} 
                                label={<Typography variant="body2">90 days&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Typography>} 
                                />
                            </RadioGroup>
                            <Box  sx={{ ml:3, alignSelf: 'center'}}>
                                {/* Invisible input field for spacing consistency */}
                                <TextField
                                size="small"
                                disabled
                                sx={{ 
                                    width: '100%', 
                                    visibility: 'hidden',
                                    height: '28px',
                                    '& input': { 
                                    fontSize: '0.875rem' 
                                    },
                                    '& .MuiOutlinedInput-root': {
                                    fontSize: '0.875rem'
                                    }
                                }}
                                InputProps={{
                                    sx: { height: '28px', fontSize: '0.875rem' }
                                }}
                                />
                            </Box>

                            {/* Row 3: DSI Forecast Method */}
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, alignSelf: 'center' }}>
                                DSI Forecast Method:
                            </Typography>
                            <RadioGroup
                                row
                                value={scenario1Filters.dsiMethod}
                                onChange={handleScenario1Change('dsiMethod')}
                                sx={{ 
                                justifyContent: 'space-between', 
                                width: '100%',
                                '& .MuiFormControlLabel-root': {
                                    margin: 0
                                }
                                }}
                            >
                                <FormControlLabel 
                                value="benchmark" 
                                control={<Radio size="small" />} 
                                label={<Typography variant="body2">Benchmark</Typography>} 
                                />
                                <FormControlLabel 
                                value="target_DSI" 
                                control={<Radio size="small" />} 
                                label={<Typography variant="body2">Target</Typography>} 
                                />
                                <FormControlLabel 
                                value="flat_change" 
                                control={<Radio size="small" />} 
                                label={<Typography variant="body2">Flat Change</Typography>} 
                                />
                            </RadioGroup>
                            <Box sx={{ ml:3, alignSelf: 'center'}}>
                                {scenario1Filters.dsiMethod === 'target_DSI' && (
                                <TextField
                                    size="small"
                                    value={scenario1Filters.dsiTarget}
                                    onChange={handleScenario1Change('dsiTarget')}
                                    placeholder="Enter target DSI"
                                    type="number"
                                    InputProps={{
                                    endAdornment: <InputAdornment position="end"><Typography variant="body2">days</Typography></InputAdornment>,
                                    sx: { height: '28px', fontSize: '0.875rem' }
                                    }}
                                    sx={{ 
                                    width: '100%',
                                    '& input': { 
                                        fontSize: '0.875rem' 
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: '0.875rem'
                                    }
                                    }}
                                />
                                )}
                                {scenario1Filters.dsiMethod === 'flat_change' && (
                                <TextField
                                    size="small"
                                    value={scenario1Filters.dsiChangeRate}
                                    onChange={handleScenario1Change('dsiChangeRate')}
                                    placeholder="Enter change rate"
                                    type="number"
                                    InputProps={{
                                    endAdornment: <InputAdornment position="end"><Typography variant="body2">%</Typography></InputAdornment>,
                                    sx: { height: '28px', fontSize: '0.875rem' }
                                    }}
                                    sx={{ 
                                    width: '100%',
                                    '& input': { 
                                        fontSize: '0.875rem' 
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: '0.875rem'
                                    }
                                    }}
                                />
                                )}
                                {scenario1Filters.dsiMethod === 'benchmark' && (
                                <TextField
                                    size="small"
                                    disabled
                                    placeholder="Using benchmark"
                                    InputProps={{
                                    sx: { height: '28px', fontSize: '0.875rem' }
                                    }}
                                    sx={{ 
                                    width: '100%',
                                    '& input': { 
                                        fontSize: '0.875rem' 
                                    },
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: '0.875rem'
                                    }
                                    }}
                                />
                                )}
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
            </CardContainer>
        </BentoItem>

        {/* Container 2: spans columns 4-6, rows 2-4 */}
        <BentoItem 
        className="bento-item"
        sx={{ 
            gridColumn: '4 / 7', 
            gridRow: '2 / 4', 
        }}
        >
        <CardContainer sx={{overflow: 'hidden'}}>
            <CardTitle>
            Scenario 2 Assumptions
            </CardTitle>
            <CardContent sx={{mb:0}}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0 }}>
                    {/* Grid layout for filter rows */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 0 }}>
                        {/* Row 1: Revenue Forecast Method */}
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, alignSelf: 'center' }}>
                            Revenue Forecast Method:
                        </Typography>
                        <RadioGroup
                            row
                            value={scenario2Filters.revenueMethod}
                            onChange={handleScenario2Change('revenueMethod')}
                            sx={{ 
                            justifyContent: 'space-between', 
                            width: '100%',
                            '& .MuiFormControlLabel-root': {
                                margin: 0
                            },
                            }}
                        >
                            <FormControlLabel 
                            value="benchmark" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">Benchmark</Typography>} 
                            />
                            <FormControlLabel 
                            value="target_revenue" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">Target</Typography>} 
                            />
                            <FormControlLabel 
                            value="flat_growth" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">Flat Growth&nbsp;</Typography>} 
                            />
                        </RadioGroup>
                        <Box sx={{ ml:3, alignSelf: 'center'}}>
                            {scenario2Filters.revenueMethod === 'target_revenue' && (
                            <TextField
                                size="small"
                                value={scenario2Filters.revenueTarget}
                                onChange={handleScenario2Change('revenueTarget')}
                                placeholder="Enter target revenue"
                                type="number"
                                InputProps={{
                                startAdornment: <InputAdornment position="start"><Typography variant="body2">$</Typography></InputAdornment>,
                                sx: { height: '28px', fontSize: '0.875rem' }
                                }}
                                sx={{ 
                                width: '100%',
                                '& input': { 
                                    fontSize: '0.875rem' 
                                },
                                '& .MuiOutlinedInput-root': {
                                    fontSize: '0.875rem'
                                }
                                }}
                            />
                            )}
                            {scenario2Filters.revenueMethod === 'flat_growth' && (
                            <TextField
                                size="small"
                                value={scenario2Filters.revenueGrowthRate}
                                onChange={handleScenario2Change('revenueGrowthRate')}
                                placeholder="Enter growth rate"
                                type="number"
                                InputProps={{
                                endAdornment: <InputAdornment position="end"><Typography variant="body2">%</Typography></InputAdornment>,
                                sx: { height: '28px', fontSize: '0.875rem' }
                                }}
                                sx={{ 
                                width: '100%',
                                '& input': { 
                                    fontSize: '0.875rem' 
                                },
                                '& .MuiOutlinedInput-root': {
                                    fontSize: '0.875rem'
                                }
                                }}
                            />
                            )}
                            {scenario2Filters.revenueMethod === 'benchmark' && (
                            <TextField
                                size="small"
                                disabled
                                placeholder="Using benchmark"
                                InputProps={{
                                sx: { height: '28px', fontSize: '0.875rem' }
                                }}
                                sx={{ 
                                width: '100%',
                                '& input': { 
                                    fontSize: '0.875rem' 
                                },
                                '& .MuiOutlinedInput-root': {
                                    fontSize: '0.875rem'
                                }
                                }}
                            />
                            )}
                        </Box>

                        {/* Row 2: DSI Period */}
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, alignSelf: 'center' }}>
                            DSI Period:
                        </Typography>
                        <RadioGroup
                            row
                            value={scenario2Filters.dsiPeriod}
                            onChange={handleScenario2Change('dsiPeriod')}
                            sx={{ 
                            justifyContent: 'space-between', 
                            width: '100%',
                            '& .MuiFormControlLabel-root': {
                                margin: 0
                            }
                            }}
                        >
                            <FormControlLabel 
                            value="30" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">30 days&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Typography>} 
                            />
                            <FormControlLabel 
                            value="60" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">60 days</Typography>} 
                            />
                            <FormControlLabel 
                            value="90" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">90 days&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</Typography>} 
                            />
                        </RadioGroup>
                        <Box sx={{ ml:3, alignSelf: 'center'}}>
                            {/* Invisible input field for spacing consistency */}
                            <TextField
                            size="small"
                            disabled
                            sx={{ 
                                width: '100%', 
                                visibility: 'hidden',
                                height: '28px',
                                '& input': { 
                                fontSize: '0.875rem' 
                                },
                                '& .MuiOutlinedInput-root': {
                                fontSize: '0.875rem'
                                }
                            }}
                            InputProps={{
                                sx: { height: '28px', fontSize: '0.875rem' }
                            }}
                            />
                        </Box>

                        {/* Row 3: DSI Forecast Method */}
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, alignSelf: 'center' }}>
                            DSI Forecast Method:
                        </Typography>
                        <RadioGroup
                            row
                            value={scenario2Filters.dsiMethod}
                            onChange={handleScenario2Change('dsiMethod')}
                            sx={{ 
                            justifyContent: 'space-between', 
                            width: '100%',
                            '& .MuiFormControlLabel-root': {
                                margin: 0
                            }
                            }}
                        >
                            <FormControlLabel 
                            value="benchmark" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">Benchmark</Typography>} 
                            />
                            <FormControlLabel 
                            value="target_DSI" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">Target</Typography>} 
                            />
                            <FormControlLabel 
                            value="flat_change" 
                            control={<Radio size="small" />} 
                            label={<Typography variant="body2">Flat Change</Typography>} 
                            />
                        </RadioGroup>
                        <Box sx={{ ml:3, alignSelf: 'center'}}>
                            {scenario2Filters.dsiMethod === 'target_DSI' && (
                            <TextField
                                size="small"
                                value={scenario2Filters.dsiTarget}
                                onChange={handleScenario2Change('dsiTarget')}
                                placeholder="Enter target DSI"
                                type="number"
                                InputProps={{
                                endAdornment: <InputAdornment position="end"><Typography variant="body2">days</Typography></InputAdornment>,
                                sx: { height: '28px', fontSize: '0.875rem' }
                                }}
                                sx={{ 
                                width: '100%',
                                '& input': { 
                                    fontSize: '0.875rem' 
                                },
                                '& .MuiOutlinedInput-root': {
                                    fontSize: '0.875rem'
                                }
                                }}
                            />
                            )}
                            {scenario2Filters.dsiMethod === 'flat_change' && (
                            <TextField
                                size="small"
                                value={scenario2Filters.dsiChangeRate}
                                onChange={handleScenario2Change('dsiChangeRate')}
                                placeholder="Enter change rate"
                                type="number"
                                InputProps={{
                                endAdornment: <InputAdornment position="end"><Typography variant="body2">%</Typography></InputAdornment>,
                                sx: { height: '28px', fontSize: '0.875rem' }
                                }}
                                sx={{ 
                                width: '100%',
                                '& input': { 
                                    fontSize: '0.875rem' 
                                },
                                '& .MuiOutlinedInput-root': {
                                    fontSize: '0.875rem'
                                }
                                }}
                            />
                            )}
                            {scenario2Filters.dsiMethod === 'benchmark' && (
                            <TextField
                                size="small"
                                disabled
                                placeholder="Using benchmark"
                                InputProps={{
                                sx: { height: '28px', fontSize: '0.875rem' }
                                }}
                                sx={{ 
                                width: '100%',
                                '& input': { 
                                    fontSize: '0.875rem' 
                                },
                                '& .MuiOutlinedInput-root': {
                                    fontSize: '0.875rem'
                                }
                                }}
                            />
                            )}
                        </Box>
                    </Box>
                </Box>
            </CardContent>
        </CardContainer>
        </BentoItem>

        {/* Container 3: spans columns 1-3, rows 4-7 */}
        <BentoItem 
        className="bento-item"
        sx={{ 
            gridColumn: '1 / 4', 
            gridRow: '4 / 8', 
        }}
        >
        <CardContainer>
            <CardTitle>
            Revenue Projection
            </CardTitle>
            <CardContent>
              <RevenueForecastLineChart
                dateUpTo={filters.dateUpTo}
                brand={filters.brand}
                ir={filters.ir}
                sku={filters.sku}
                revenueMethod={scenario1Filters.revenueMethod}
                revenueTarget={scenario1Filters.revenueTarget}
                revenueGrowthRate={scenario1Filters.revenueGrowthRate}
                dsiPeriod={scenario1Filters.dsiPeriod}
                dsiMethod={scenario1Filters.dsiMethod}
                dsiTarget={scenario1Filters.dsiTarget}
                dsiChangeRate={scenario1Filters.dsiChangeRate}
                scenario="1"
              />
            </CardContent>
        </CardContainer>
        </BentoItem>

        {/* Container 4: spans columns 4-6, rows 4-7 */}
        <BentoItem 
        className="bento-item"
        sx={{ 
            gridColumn: '4 / 7', 
            gridRow: '4 / 8', 
        }}
        >
        <CardContainer>
            <CardTitle>
            Revenue Projection
            </CardTitle>
            <CardContent>
              <RevenueForecastLineChart
                dateUpTo={filters.dateUpTo}
                brand={filters.brand}
                ir={filters.ir}
                sku={filters.sku}
                revenueMethod={scenario2Filters.revenueMethod}
                revenueTarget={scenario2Filters.revenueTarget}
                revenueGrowthRate={scenario2Filters.revenueGrowthRate}
                dsiPeriod={scenario2Filters.dsiPeriod}
                dsiMethod={scenario2Filters.dsiMethod}
                dsiTarget={scenario2Filters.dsiTarget}
                dsiChangeRate={scenario2Filters.dsiChangeRate}
                scenario="2"
              />
            </CardContent>
        </CardContainer>
        </BentoItem>

        {/* Container 5: spans 1-3 columns, rows 8-12 */}
        <BentoItem 
        className="bento-item"
        sx={{ 
            gridColumn: '1 / 4', 
            gridRow: '8 / 13', 
        }}
        >
        <CardContainer>
            <CardTitle>
            Projected Financials
            </CardTitle>
            <CardContent>
              <RevenueForecastTable
                  dateUpTo={filters.dateUpTo}
                  brand={filters.brand}
                  ir={filters.ir}
                  sku={filters.sku}
                  revenueMethod={scenario1Filters.revenueMethod}
                  revenueTarget={scenario1Filters.revenueTarget}
                  revenueGrowthRate={scenario1Filters.revenueGrowthRate}
                  dsiPeriod={scenario1Filters.dsiPeriod}
                  dsiMethod={scenario1Filters.dsiMethod}
                  dsiTarget={scenario1Filters.dsiTarget}
                  dsiChangeRate={scenario1Filters.dsiChangeRate}
                  scenario="1"
              />
            </CardContent>
        </CardContainer>
        </BentoItem>

        {/* Container 6: spans 4-6 columns, rows 8-12 */}
        <BentoItem 
        className="bento-item"
        sx={{ 
            gridColumn: '4 / 7', 
            gridRow: '8 / 13', 
        }}
        >
        <CardContainer>
            <CardTitle>
            Projected Financials
            </CardTitle>
            <CardContent>
              <RevenueForecastTable
                  dateUpTo={filters.dateUpTo}
                  brand={filters.brand}
                  ir={filters.ir}
                  sku={filters.sku}
                  revenueMethod={scenario2Filters.revenueMethod}
                  revenueTarget={scenario2Filters.revenueTarget}
                  revenueGrowthRate={scenario2Filters.revenueGrowthRate}
                  dsiPeriod={scenario2Filters.dsiPeriod}
                  dsiMethod={scenario2Filters.dsiMethod}
                  dsiTarget={scenario2Filters.dsiTarget}
                  dsiChangeRate={scenario2Filters.dsiChangeRate}
                  scenario="2"
              />
            </CardContent>
        </CardContainer>
        </BentoItem>
    </BentoGrid>
    </Box>
  );
};

export default RevenueStrategy; 