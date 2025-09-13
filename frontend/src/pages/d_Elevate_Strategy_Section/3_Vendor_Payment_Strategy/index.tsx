import React, { useState, useEffect } from 'react';
import { Box, Paper, styled, Typography, CircularProgress, TextField, Divider, Autocomplete, MenuItem, FormControlLabel, Radio, RadioGroup, InputAdornment, FormLabel, FormControl, Select, SelectChangeEvent } from '@mui/material';
import axios from 'axios';
import { api } from '../../../services/api';
import AR_AP_Statement_with_Forecast_ComboChart from '../../../components/Charts/AR_AP_StatementsClosing_with_Forecast_SummaryChart';
import Cash_VendorAPClosing_Chart from '../../../components/Charts/Cash_VendorAPClosing_with_Forecast_SummaryChart';
import POGanttChart from '../../../components/Charts/POGanttChart';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

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
//   border: '1px dashed #aaa', 
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
    paddingTop: theme.spacing(1.5),
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

const VendorPaymentStrategy: React.FC = () => {
  // Filter states
  const [filters, setFilters] = useState({
    brand: '',
    ir: '',
    fbmShippingCostRatio: '',
  });
  
  // Scenario filter states
  const [scenarioFilters, setScenarioFilters] = useState({
    revenueMethod: 'benchmark' as 'benchmark' | 'target_revenue' | 'flat_growth', // properly typed
    revenueTarget: '',
    revenueGrowthRate: '',
    // Add DSI period and method filters
    dsiPeriod: '30' as '30' | '60' | '90',
    dsiMethod: 'benchmark' as 'benchmark' | 'target_DSI' | 'flat_change',
    dsiTarget: '',
    dsiChangeRate: '',
  });
  
  // Available filter options
  const [filterOptions, setFilterOptions] = useState<{
    brands: string[];
    ir_items: string[];
  }>({
    brands: [],
    ir_items: [],
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for search text in the dropdowns
  const [brandSearch, setBrandSearch] = useState('');
  const [irSearch, setIrSearch] = useState('');

  // PO Date Range states
  const [poStartDate, setPoStartDate] = useState<Date | null>(null);
  const [poEndDate, setPoEndDate] = useState<Date | null>(null);
  const [targetDSI, setTargetDSI] = useState<string>('');

  // Handlers for Scenario filters - for text inputs
  const handleScenarioChange = (filterName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setScenarioFilters({
      ...scenarioFilters,
      [filterName]: event.target.value
    });
  };

  // Handler for select fields
  const handleSelectChange = (filterName: string) => (event: SelectChangeEvent) => {
    setScenarioFilters({
      ...scenarioFilters,
      [filterName]: event.target.value
    });
  };

  // Fetch filter options from the backend
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(true);
        const response = await api.get('/filters_all_brand_component_sku');
        setFilterOptions({
          brands: response.data.brands || [],
          ir_items: response.data.ir_items || [],
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

  // Dynamic styles that depend on state
  const getSelectStyles = (value: string) => ({
    ...selectSx,
    '& .MuiSelect-select.MuiSelect-select': {
      color: value ? '#000000' : '#9e9e9e'
    }
  });

  // Format date as YYYY-MM-DD without timezone issues
  const formatDateForAPI = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return '';
    // Get local date parts to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle date changes
  const handlePoStartDateChange = (newDate: Date | null) => {
    setPoStartDate(newDate);
  };

  const handlePoEndDateChange = (newDate: Date | null) => {
    setPoEndDate(newDate);
  };

  const handleTargetDSIChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTargetDSI(event.target.value);
  };

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
            gridColumn: '1 / 4', 
            gridRow: '1 / 3', // Span first row
        }}
        >
        <FilterCardContainer sx={{}}>
            <CardContent>
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
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          gap: 1,
                        }}
                      >
                        {/* Row 1: Brand and PC */}
                        <Box sx={{display: 'flex', gap: 6}}>
                          {/* Filter 1: Brand */}
                          <FilterContainer sx={{ flex: 1, mb: 1 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0, width: '100%' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#555', width: '220px', alignSelf: 'center' }}>
                                    Brand:
                                </Typography>
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
                                sx={{ minWidth: 150, width: '100%' }} 
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
                            </Box>
                          </FilterContainer>

                          {/* Filter 2: PC */}
                          <FilterContainer sx={{ flex: 1, mb: 1 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 0, width: '100%' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#555', width: '90px', alignSelf: 'center' }}>
                                    PC:
                                </Typography>
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
                                sx={{  minWidth: 150, width: '100%' }} 
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
                            </Box>
                          </FilterContainer>
                        </Box>

                        {/* Row 2: Revenue Forecast Method and FBM Shipping Cost */}
                        <Box sx={{display: 'flex', gap: 6}}>
                          {/* Filter 3: Revenue Forecast Method - Column 1 */}
                          <FilterContainer sx={{ flex: 1, mb: 1 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 0, width: '100%' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#555', width: '220px', alignSelf: 'center' }}>
                                    Revenue Forecast Method:
                                </Typography>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <Select
                                    value={scenarioFilters.revenueMethod}
                                    onChange={(e) => {
                                        setScenarioFilters({
                                        ...scenarioFilters,
                                        revenueMethod: e.target.value as 'benchmark' | 'target_revenue' | 'flat_growth'
                                        });
                                    }}
                                    displayEmpty
                                    sx={{ 
                                        fontSize: '0.85rem',
                                        '& .MuiSelect-select': {
                                        padding: '4px 14px',
                                        height: '18px',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                        color: '#9e9e9e',
                                        opacity: 1,
                                        },
                                        '& .MuiOutlinedInput-input': {
                                        padding: '4px 14px',
                                        },
                                    }}
                                    >
                                    <MenuItem value="benchmark" sx={menuItemSx}>Benchmark</MenuItem>
                                    <MenuItem value="target_revenue" sx={menuItemSx}>Target</MenuItem>
                                    <MenuItem value="flat_growth" sx={menuItemSx}>Flat Growth</MenuItem>
                                    </Select>
                                </FormControl>
                                {scenarioFilters.revenueMethod === 'target_revenue' && (
                                  <TextField
                                    size="small"
                                    value={scenarioFilters.revenueTarget}
                                    onChange={handleScenarioChange('revenueTarget')}
                                    placeholder="Enter target"
                                    type="number"
                                    InputProps={{
                                      endAdornment: <InputAdornment position="end"><Typography variant="body2">$</Typography></InputAdornment>,
                                      style: { fontSize: '0.85rem', padding: '0px' }
                                    }}
                                    sx={{ 
                                        width: '100%',
                                        ml:3,
                                        '& .MuiInputBase-root': {
                                            padding: '0px 8px 0px 0px',
                                        },
                                        '& .MuiOutlinedInput-input': {
                                            padding: '4px 2px 4px 10px',
                                            height: '18px',
                                            fontSize: '0.85rem',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            color: '#9e9e9e',
                                            opacity: 1,
                                        },
                                        '& .MuiInputAdornment-root': {
                                            marginLeft: '0px',
                                            marginRight: '8px',
                                        }
                                    }}
                                  />
                                )}
                                {scenarioFilters.revenueMethod === 'flat_growth' && (
                                  <TextField
                                    size="small"
                                    value={scenarioFilters.revenueGrowthRate}
                                    onChange={handleScenarioChange('revenueGrowthRate')}
                                    placeholder="Enter rate"
                                    type="number"
                                    InputProps={{
                                      endAdornment: <InputAdornment position="end"><Typography variant="body2">%</Typography></InputAdornment>,
                                      style: { fontSize: '0.85rem', padding: '0px' }
                                    }}
                                    sx={{ 
                                        width: '100%',
                                        ml:3,
                                        '& .MuiInputBase-root': {
                                            padding: '0px 8px 0px 0px',
                                        },
                                        '& .MuiOutlinedInput-input': {
                                            padding: '4px 2px 4px 10px',
                                            height: '18px',
                                            fontSize: '0.85rem',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            color: '#9e9e9e',
                                            opacity: 1,
                                        },
                                        '& .MuiInputAdornment-root': {
                                            marginLeft: '0px',
                                            marginRight: '8px',
                                      }
                                    }}
                                  />
                                )}
                                {scenarioFilters.revenueMethod === 'benchmark' && (
                                  <TextField
                                    size="small"
                                    disabled
                                    placeholder="Using Benchmark"
                                    InputProps={{
                                      style: { fontSize: '0.85rem', padding: '0px'}
                                    }}
                                    sx={{ 
                                      width: '100%',
                                      ml:3,
                                      '& .MuiInputBase-root': {
                                        padding: '0px 8px 0px 0px',
                                      },
                                      '& .MuiOutlinedInput-input': {
                                        padding: '4px 10px',
                                        height: '18px',
                                        fontSize: '0.85rem',
                                      },
                                      '& .MuiInputBase-input::placeholder': {
                                        color: '#9e9e9e',
                                        opacity: 1,
                                      }
                                    }}
                                  />
                                )}
                            </Box>
                          </FilterContainer>

                          {/* Filter 4: FBM Shipping Cost to Revenue Ratio - Column 2 */}
                          <FilterContainer sx={{ flex: 1, mb: 1 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, width: '100%' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#555', width: '300px', alignSelf: 'center' }}>
                                    FBM Shipping Cost to Revenue Ratio:
                                </Typography>
                                <Box sx={{ alignSelf: 'center' }}>
                                    <TextField
                                        size="small"
                                        value={filters.fbmShippingCostRatio}
                                        onChange={(e) => setFilters({
                                        ...filters,
                                        fbmShippingCostRatio: e.target.value
                                        })}
                                        placeholder="Enter ratio"
                                        type="number"
                                        InputProps={{
                                        endAdornment: <InputAdornment position="end"><Typography variant="body2">%</Typography></InputAdornment>,
                                        style: { fontSize: '0.85rem', padding: '0px' },
                                        }}
                                        sx={{ 
                                        width: '100%',
                                        '& .MuiInputBase-root': {
                                            padding: '0px 8px 0px 0px',
                                        },
                                        '& .MuiOutlinedInput-input': {
                                            padding: '4px 2px 4px 10px',
                                            height: '18px',
                                            fontSize: '0.85rem',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            color: '#9e9e9e',
                                            opacity: 1,
                                        },
                                        '& .MuiInputAdornment-root': {
                                            marginLeft: '0px',
                                            marginRight: '8px',
                                        }
                                    }}
                                    />
                                </Box>
                            </Box>
                          </FilterContainer>
                        </Box>

                        {/* Row 3: DSI Period and DSI Forecast Method */}
                        <Box sx={{display: 'flex', gap: 6}}>
                          {/* Filter 5: DSI Forecast Method - Column 1 */}
                          <FilterContainer sx={{ flex: 1, mb: 0 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 0, width: '100%' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#555', width: '220px', alignSelf: 'center' }}>
                                DSI Forecast Method:
                              </Typography>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                  <Select
                                    value={scenarioFilters.dsiMethod}
                                    onChange={(e) => {
                                      setScenarioFilters({
                                        ...scenarioFilters,
                                        dsiMethod: e.target.value as 'benchmark' | 'target_DSI' | 'flat_change'
                                      });
                                    }}
                                    displayEmpty
                                    sx={{ 
                                      fontSize: '0.85rem',
                                      '& .MuiSelect-select': {
                                        padding: '4px 14px',
                                        height: '18px',
                                      },
                                      '& .MuiInputBase-input::placeholder': {
                                        color: '#9e9e9e',
                                        opacity: 1,
                                      },
                                      '& .MuiOutlinedInput-input': {
                                        padding: '4px 14px',
                                      },
                                    }}
                                  >
                                    <MenuItem value="benchmark" sx={menuItemSx}>Benchmark</MenuItem>
                                    <MenuItem value="target_DSI" sx={menuItemSx}>Target</MenuItem>
                                    <MenuItem value="flat_change" sx={menuItemSx}>Flat Change</MenuItem>
                                  </Select>
                                </FormControl>
                                {scenarioFilters.dsiMethod === 'target_DSI' && (
                                  <TextField
                                    size="small"
                                    value={scenarioFilters.dsiTarget}
                                    onChange={handleScenarioChange('dsiTarget')}
                                    placeholder="Enter target DSI"
                                    type="number"
                                    InputProps={{
                                      endAdornment: <InputAdornment position="end"><Typography variant="body2">days</Typography></InputAdornment>,
                                      style: { fontSize: '0.85rem', padding: '0px' }
                                    }}
                                    sx={{ 
                                        width: '100%',
                                        ml:3,
                                        '& .MuiInputBase-root': {
                                            padding: '0px 8px 0px 0px',
                                        },
                                        '& .MuiOutlinedInput-input': {
                                            padding: '4px 2px 4px 10px',
                                            height: '18px',
                                            fontSize: '0.85rem',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            color: '#9e9e9e',
                                            opacity: 1,
                                        },
                                        '& .MuiInputAdornment-root': {
                                            marginLeft: '0px',
                                            marginRight: '8px',
                                        }
                                    }}
                                  />
                                )}
                                {scenarioFilters.dsiMethod === 'flat_change' && (
                                  <TextField
                                    size="small"
                                    value={scenarioFilters.dsiChangeRate}
                                    onChange={handleScenarioChange('dsiChangeRate')}
                                    placeholder="Enter change rate"
                                    type="number"
                                    InputProps={{
                                      endAdornment: <InputAdornment position="end"><Typography variant="body2">%</Typography></InputAdornment>,
                                      style: { fontSize: '0.85rem', padding: '0px' }
                                    }}
                                    sx={{ 
                                        width: '100%',
                                        ml:3,
                                        '& .MuiInputBase-root': {
                                            padding: '0px 8px 0px 0px',
                                        },
                                        '& .MuiOutlinedInput-input': {
                                            padding: '4px 2px 4px 10px',
                                            height: '18px',
                                            fontSize: '0.85rem',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            color: '#9e9e9e',
                                            opacity: 1,
                                        },
                                        '& .MuiInputAdornment-root': {
                                            marginLeft: '0px',
                                            marginRight: '8px',
                                        }
                                    }}
                                  />
                                )}
                                {scenarioFilters.dsiMethod === 'benchmark' && (
                                  <TextField
                                    size="small"
                                    disabled
                                    placeholder="Using Benchmark"
                                    InputProps={{
                                      style: { fontSize: '0.85rem', padding: '0px' }
                                    }}
                                    sx={{ 
                                        width: '100%',
                                        ml:3,
                                        '& .MuiInputBase-root': {
                                            padding: '0px 8px 0px 0px',
                                        },
                                        '& .MuiOutlinedInput-input': {
                                            padding: '4px 10px',
                                            height: '18px',
                                            fontSize: '0.85rem',
                                        },
                                        '& .MuiInputBase-input::placeholder': {
                                            color: '#9e9e9e',
                                            opacity: 1,
                                        }
                                    }}
                                  />
                                )}
                            </Box>
                          </FilterContainer>

                          {/* Filter 6: DSI Period - Column 2 */}
                          <FilterContainer sx={{ flex: 1, mb: 0 }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, width: '100%' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#555', width: '300px', alignSelf: 'center' }}>
                                DSI Period:
                              </Typography>
                              <Box sx={{alignItems: 'center' }}>
                                <FormControl size="small" sx={{ width: '100%' }}>
                                  <Select
                                    value={scenarioFilters.dsiPeriod}
                                    onChange={(e) => {
                                      setScenarioFilters({
                                        ...scenarioFilters,
                                        dsiPeriod: e.target.value as '30' | '60' | '90'
                                      });
                                    }}
                                    displayEmpty
                                    sx={{ 
                                      fontSize: '0.85rem',
                                      '& .MuiSelect-select': {
                                        padding: '4px 14px',
                                        height: '18px',
                                      },
                                      '& .MuiInputBase-input::placeholder': {
                                        color: '#9e9e9e',
                                        opacity: 1,
                                      },
                                      '& .MuiOutlinedInput-input': {
                                        padding: '4px 14px',
                                      },
                                    }}
                                  >
                                    <MenuItem value="30" sx={menuItemSx}>30 days</MenuItem>
                                    <MenuItem value="60" sx={menuItemSx}>60 days</MenuItem>
                                    <MenuItem value="90" sx={menuItemSx}>90 days</MenuItem>
                                  </Select>
                                </FormControl>
                              </Box>
                            </Box>
                          </FilterContainer>
                        </Box>
                      </Box>
                    </Box>
                )}
            </CardContent>
        </FilterCardContainer>
        </BentoItem>
        
        {/* Container 1: spans columns 1-3, rows 2-6 */}
        <BentoItem 
        className="bento-item"
        sx={{ 
            gridColumn: '1 / 4', 
            gridRow: '3 / 9', 
        }}
        >
            <CardContainer sx={{overflow: 'hidden'}}>
                <CardTitle>
                AR AP Trend (Amazon & FBM)
                </CardTitle>
                <CardContent sx={{mb:0}}>
                    {/* Add AR_AP Chart */}
                    <AR_AP_Statement_with_Forecast_ComboChart 
                      brand={filters.brand}
                      ir={filters.ir}
                      revenueMethod={scenarioFilters.revenueMethod}
                      revenueTarget={scenarioFilters.revenueTarget}
                      revenueGrowthRate={scenarioFilters.revenueGrowthRate}
                      fbmShippingCostRatio={filters.fbmShippingCostRatio}
                    />
                </CardContent>
            </CardContainer>
        </BentoItem>

        {/* Container 2: spans columns 1-3, rows 6-11 */}
        <BentoItem 
        className="bento-item"
        sx={{ 
            gridColumn: '1 / 4', 
            gridRow: '9 / 15', 
        }}
        >
        <CardContainer>
            <CardTitle>
            Cash Flow Projection (Cash Net Payment to Vendor)
            </CardTitle>
            <CardContent>
              <Cash_VendorAPClosing_Chart
                brand={filters.brand}
                ir={filters.ir}
                revenueMethod={scenarioFilters.revenueMethod}
                revenueTarget={scenarioFilters.revenueTarget}
                revenueGrowthRate={scenarioFilters.revenueGrowthRate}
                fbmShippingCostRatio={filters.fbmShippingCostRatio}
                dsiPeriod={scenarioFilters.dsiPeriod}
                dsiMethod={scenarioFilters.dsiMethod}
                dsiTarget={scenarioFilters.dsiTarget}
                dsiChangeRate={scenarioFilters.dsiChangeRate}
              />
            </CardContent>
        </CardContainer>
        </BentoItem>

        {/* Container 3: spans 4-6 columns, rows 2-11 */}
        <BentoItem 
        className="bento-item"
        sx={{ 
            gridColumn: '4 / 7', 
            gridRow: '1 / 15', 
        }}
        >
        <CardContainer>
            <CardTitle>PO Consumption</CardTitle>
            <CardContent>
                {/* PO Order Date Range Filter */}
                <Box sx={{ mt: 1, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#555', width: '160px', flexShrink: 0 }}>
                        PO Order Date Range:
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                        value={poStartDate}
                        onChange={handlePoStartDateChange}
                        format="yyyy-MM-dd"
                        slotProps={{
                            textField: {
                            size: 'small',
                            variant: 'outlined',
                            placeholder: 'Start Date',
                            inputProps: {
                                style: { fontSize: '0.85rem', padding: '4px 14px' },
                            },
                            sx: {
                                width: '100%',
                                '& .MuiInputBase-input::placeholder': {
                                color: '#9e9e9e',
                                opacity: 1,
                                },
                            },
                            },
                        }}
                        />
                    </LocalizationProvider>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                        value={poEndDate}
                        onChange={handlePoEndDateChange}
                        format="yyyy-MM-dd"
                        slotProps={{
                            textField: {
                            size: 'small',
                            variant: 'outlined',
                            placeholder: 'End Date',
                            inputProps: {
                                style: { fontSize: '0.85rem', padding: '4px 14px' },
                            },
                            sx: {
                                width: '100%',
                                '& .MuiInputBase-input::placeholder': {
                                color: '#9e9e9e',
                                opacity: 1,
                                },
                            },
                            },
                        }}
                        />
                    </LocalizationProvider>
                    </Box>
                </Box>

                {/* Target DSI Input */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#555', width: '160px', flexShrink: 0 }}>
                        Target DSI:
                    </Typography>
                    <TextField
                        size="small"
                        variant="outlined"
                        type="number"
                        placeholder="Numbers of days targeted for full consumption"
                        value={targetDSI}
                        onChange={handleTargetDSIChange}
                        InputProps={{
                        endAdornment: <InputAdornment position="end"><Typography variant="body2">days</Typography></InputAdornment>,
                        style: { fontSize: '0.85rem', padding: '0px' }
                      }}
                      sx={{
                        flex: 1,
                        '& .MuiInputBase-root': {
                          padding: '0px 8px 0px 0px',
                        },
                        '& .MuiOutlinedInput-input': {
                          padding: '4px 14px',
                          height: '18px',
                          fontSize: '0.85rem',
                        },
                        '& .MuiInputBase-input::placeholder': {
                          color: '#9e9e9e',
                          opacity: 1,
                        },
                        '& .MuiInputAdornment-root': {
                            marginLeft: '0px',
                            marginRight: '8px',
                        }
                      }}
                    />
                    </Box>
                </Box>

                {/* PO Gantt Chart */}
                <Box sx={{ 
                flexGrow: 1, 
                mt: 2, 
                height: 'calc(100% - 90px)', 
                // height: '100%',
                minHeight: '400px', 
                // overflow: 'hidden', 
                display: 'flex',
                flexDirection: 'column'
              }}>
                <POGanttChart 
                  brand={filters.brand}
                  ir={filters.ir}
                  poStartDate={poStartDate}
                  poEndDate={poEndDate}
                  targetDSI={targetDSI}
                />
              </Box>
            </CardContent>
            </CardContainer>

        </BentoItem>
    </BentoGrid>
    </Box>
  );
};

export default VendorPaymentStrategy;
