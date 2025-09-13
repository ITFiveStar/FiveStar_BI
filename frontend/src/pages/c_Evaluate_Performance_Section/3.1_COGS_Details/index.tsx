import React, { useState, useEffect } from 'react';
import { Box, Paper, styled, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Radio, RadioGroup, FormLabel, CircularProgress, TextField, Divider, Autocomplete } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import axios from 'axios';
import { api } from '../../../services/api';
import { theme } from '../../../theme';
import { format } from 'date-fns';
import BrandCOGSPieChart from '../../../components/Charts/COGS_by_brand_PConly_PieChart';
import ProductCOGSPieChart from '../../../components/Charts/COGS_by_product_HWAccessoryOSonly_PieChart';
import BrandPOPieChart from '../../../components/Charts/PO_by_brand_PConly_PieChart';
import ProductPOPieChart from '../../../components/Charts/PO_by_product_HWAccessoryOSonly_PieChart';
import MainComponentProcurementCostLineChart from '../../../components/Charts/Main_Component_PO_Cost_LineChart';
import DSITable from '../../../components/Tables/DSITable';

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

// Interface for COGS summary data
interface COGSSummary {
  total_cogs: number;
  component_cogs: {
    PC: number;
    Hardware: number;
    Accessory: number;
    OS: number;
  };
  total_gross_margin: number;
  total_gross_margin_percentage: number;
  component_cost_percentage: {
    PC: number;
    Hardware: number;
    Accessory: number;
    OS: number;
  };
  period: string;
  as_of_date: string;
  filters: {
    brand: string;
    ir: string;
    sku: string;
    displayMode: string;
  };
}

const COGSDetails: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  // Filter states
  const [filters, setFilters] = useState({
    brand: '',
    ir: '',
    sku: '',
    displayMode: 'month',
    dateUpTo: null as Date | null // Store as Date object instead of string
  });
  
  // COGS Summary data
  const [cogsSummary, setCogsSummary] = useState<COGSSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
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

  // Fetch filter options from the backend
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setLoading(true);
        const response = await api.get('/filters_all_brand_component_sku');
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

  // Fetch COGS summary data based on filters
  useEffect(() => {
    const fetchCOGSSummary = async () => {
      try {
        setLoadingSummary(true);
        
        // Build query params from filters
        const params = new URLSearchParams();
        if (filters.brand) params.append('brand', filters.brand);
        if (filters.ir) params.append('ir', filters.ir);
        if (filters.sku) params.append('sku', filters.sku);
        if (filters.displayMode) params.append('displayMode', filters.displayMode);
        if (filters.dateUpTo) params.append('dateUpTo', formatDateForAPI(filters.dateUpTo));
        
        const response = await api.get(`/cogs_details/COGS_summary_card?${params.toString()}`);
        setCogsSummary(response.data);
        setSummaryError(null);
      } catch (err) {
        console.error('Error fetching COGS summary:', err);
        setSummaryError('No enough data available based on the selected filters.');
      } finally {
        setLoadingSummary(false);
      }
    };

    // Only fetch summary data if filters have been loaded
    if (!loading) {
      fetchCOGSSummary();
    }
  }, [filters, loading]);

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
        {/* Container 1: spans columns 1-2, spans rows 1-3 */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 3', 
            gridRow: '1 / 4', // Span first 3 rows
          }}
        >
          <CardContainer>
            <CardTitle>
              Filters
            </CardTitle>
            <CardContent>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={30} />
                </Box>
              ) : error ? (
                <Typography color="error" align="center">
                  {error}
                </Typography>
              ) : (
                <>
                  {/* Filter 1: Brand */}
                  <FilterContainer sx={{ mt:1 }}>
                    <FilterLabel>Brand</FilterLabel>
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
                            style: { fontSize: '0.85rem', padding: '0px' }
                          }}
                          sx={{ 
                            '& .MuiInputBase-root': { 
                              padding: '0px 14px 0px 0px'
                            },
                            '& .MuiOutlinedInput-input': {
                              padding: '4px 14px'
                            },
                            '& .MuiInputBase-input::placeholder': {
                              color: '#9e9e9e',
                              opacity: 1
                            }
                          }}
                        />
                      )}
                      fullWidth
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
                  <FilterContainer>
                    <FilterLabel>PC</FilterLabel>
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
                            style: { fontSize: '0.85rem', padding: '0px' }
                          }}
                          sx={{ 
                            '& .MuiInputBase-root': { 
                              padding: '0px 14px 0px 0px'
                            },
                            '& .MuiOutlinedInput-input': {
                              padding: '4px 14px'
                            },
                            '& .MuiInputBase-input::placeholder': {
                              color: '#9e9e9e',
                              opacity: 1
                            }
                          }}
                        />
                      )}
                      fullWidth
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
                  <FilterContainer>
                    <FilterLabel>SKU</FilterLabel>
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
                            style: { fontSize: '0.85rem', padding: '0px' }
                          }}
                          sx={{ 
                            '& .MuiInputBase-root': { 
                              padding: '0px 14px 0px 0px'
                            },
                            '& .MuiOutlinedInput-input': {
                              padding: '4px 14px'
                            },
                            '& .MuiInputBase-input::placeholder': {
                              color: '#9e9e9e',
                              opacity: 1
                            }
                          }}
                        />
                      )}
                      fullWidth
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

                  {/* Filter 4: Display Mode and Date Filter */}
                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, width: '100%' }}>
                    <FilterContainer sx={{ flexShrink: 0 }}>
                      <FilterLabel>Display</FilterLabel>
                      <RadioGroup
                        value={filters.displayMode}
                        onChange={handleFilterChange('displayMode')}
                        sx={{ flexDirection: 'row' }}
                      >
                        <FormControlLabel 
                          value="month" 
                          control={<Radio size="small" />} 
                          label={<Typography variant="subtitle2">By Month</Typography>} 
                          sx={{ marginRight: 1 }}
                        />
                        <FormControlLabel 
                          value="quarter" 
                          control={<Radio size="small" />}
                          label={<Typography variant="subtitle2">By Quarter</Typography>}
                        />
                      </RadioGroup>
                    </FilterContainer>
                    
                    <FilterContainer sx={{ flexGrow: 1 }}>
                      <FilterLabel>Date Up To</FilterLabel>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          value={filters.dateUpTo}
                          onChange={handleDateChange}
                          format="yyyy-MM-dd"
                          slotProps={{
                            textField: {
                              fullWidth: true, 
                              size: "small",
                              variant: "outlined",
                              placeholder: 'YYYY-MM-DD',
                              inputProps: {
                                style: { fontSize: '0.85rem', padding: '4px 14px' }
                              },
                              sx: { 
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
                </>
              )}
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Container 2: spans columns 3-4, spans rows 1-3 */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '3 / 5', 
            gridRow: '1 / 4', // Span first 3 rows
          }}
        >
          <CardContainer>
            <CardTitle>
              COGS
              {cogsSummary && 
                <Typography sx={{ fontWeight: 600, marginBottom: theme.spacing(0.8) }}>
                  {`${cogsSummary.period} as of ${cogsSummary.as_of_date}`}
                </Typography>
              }
            </CardTitle>
            <CardContent>
              {loadingSummary ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={30} />
                </Box>
              ) : summaryError ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary" align="center">
                    {summaryError}
                  </Typography>
                </Box>
              ) : cogsSummary ? (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {formatCurrency(cogsSummary.total_cogs)}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ mb: 1 }} />
                  
                  <Box sx={{ px: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>PC</Typography>
                      <Typography variant="body2">{formatCurrency(cogsSummary.component_cogs.PC)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Hardware</Typography>
                      <Typography variant="body2">{formatCurrency(cogsSummary.component_cogs.Hardware)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Accessory</Typography>
                      <Typography variant="body2">{formatCurrency(cogsSummary.component_cogs.Accessory)}</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Operating System</Typography>
                      <Typography variant="body2">{formatCurrency(cogsSummary.component_cogs.OS)}</Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Typography align="center">No data available</Typography>
              )}
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Container 3: spans columns 5-6, spans rows 1-3 */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '5 / 7', 
            gridRow: '1 / 4', // Span first 3 rows
          }}
        >
          <CardContainer>
            <CardTitle>
              Gross Margin
              {cogsSummary && 
                <Typography sx={{ fontWeight: 600, marginBottom: theme.spacing(0.8) }}>
                  {`${cogsSummary.period} as of ${cogsSummary.as_of_date}`}
                </Typography>
              }
            </CardTitle>
            <CardContent>
              {loadingSummary ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={30} />
                </Box>
              ) : summaryError ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary" align="center">
                    {summaryError}
                  </Typography>
                </Box>
              ) : cogsSummary ? (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {formatCurrency(cogsSummary.total_gross_margin)}
                      <Typography component="span" variant="body1" sx={{ ml: 1}}>
                        (Gross Margin: {cogsSummary.total_gross_margin_percentage.toFixed(1)}%, COGS: {(100 - cogsSummary.total_gross_margin_percentage).toFixed(1)}%)
                      </Typography>
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ mb: 1 }} />
                  
                  <Box sx={{ px: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>PC</Typography>
                      <Typography variant="body2">{cogsSummary.component_cost_percentage.PC.toFixed(1)}%</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Hardware</Typography>
                      <Typography variant="body2">{cogsSummary.component_cost_percentage.Hardware.toFixed(1)}%</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Accessory</Typography>
                      <Typography variant="body2">{cogsSummary.component_cost_percentage.Accessory.toFixed(1)}%</Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Operating System</Typography>
                      <Typography variant="body2">{cogsSummary.component_cost_percentage.OS.toFixed(1)}%</Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Typography align="center">No data available</Typography>
              )}
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Container 4: spans row 4, all columns */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 3', // Span all columns
            gridRow: '4 / 5', // Row 4 only
          }}
        >
          <CardContainer sx={{ paddingTop: 0, paddingBottom: 0, m: 0 }}>
            <Tabs 
                value={activeTab} 
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{ 
                    '& .MuiTabs-flexContainer': { 
                        justifyContent: 'flex-start' 
                    },
                    '& .MuiTab-root': { 
                        fontSize: '1rem',
                        fontWeight: 700,
                        px: 0,
                        pl: 0,
                        mr: 4,
                        minWidth: 'auto',
                        textTransform: 'none',
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                        '& .MuiTab-wrapper': {
                            display: 'block',
                            textAlign: 'left',
                            alignItems: 'flex-start'
                        }
                    },
                    ml: 0,
                    pl: 0,
                    mt: 0.5
                }}
                TabIndicatorProps={{
                    sx: { height: 3 }
                }}
            >
                <Tab label="PC" sx={{ pl: 0, ml: 0 }} />
                <Tab label="Hardware" />
                <Tab label="Accessory" />
                <Tab label="Operating System" />
            </Tabs>
          </CardContainer>
        </BentoItem>

        {/* Container 5: spans columns 1-2, spans rows 5-8 */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 3', 
            gridRow: '5 / 9', // Span rows 5-8
          }}
        >
          <CardContainer>
            <CardTitle>
              {activeTab === 0 ? "Brand Distribution - COGS" : "Products Distribution - COGS"}
            </CardTitle>
            <CardContent>
              {activeTab === 0 ? (
                <BrandCOGSPieChart 
                  displayMode={filters.displayMode} 
                  dateUpTo={filters.dateUpTo} 
                />
              ) : (
                <ProductCOGSPieChart
                  displayMode={filters.displayMode} 
                  dateUpTo={filters.dateUpTo}
                  activeTab={activeTab}
                />
              )}
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Container 6: spans columns 1-2, spans rows 9-12 */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 3', 
            gridRow: '9 / 13', // Span rows 9-12
          }}
        >
          <CardContainer>
            <CardTitle>
              {activeTab === 0 ? "Brand Distribution - Procurement Cost" : "Products Distribution - Procurement Cost"}
            </CardTitle>
            <CardContent>
              {activeTab === 0 ? (
                <BrandPOPieChart
                  displayMode={filters.displayMode} 
                  dateUpTo={filters.dateUpTo} 
                />
              ) : (
                <ProductPOPieChart
                  displayMode={filters.displayMode} 
                  dateUpTo={filters.dateUpTo}
                  activeTab={activeTab}
                />
              )}
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Container 7: spans columns 3-6, spans rows 5-7 */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '3 / 7', // Span columns 3-6
            gridRow: '4 / 8', // Span rows 5-8
          }}
        >
          <CardContainer>
            <CardTitle>
              PC Procurement Cost Trends
            </CardTitle>
            <CardContent>
              <MainComponentProcurementCostLineChart 
                displayMode={filters.displayMode as 'month' | 'quarter'}
                dateUpTo={filters.dateUpTo}
                brand={filters.brand || undefined}
                ir={filters.ir || undefined}
              />
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Container 8: spans columns 3-6, spans rows 8-12 */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '3 / 7', // Span columns 3-6
            gridRow: '8 / 13', // Span rows 8-12
          }}
        >
          <CardContainer>
            <CardTitle>
              DSI Trends & Stock Up Suggestion
            </CardTitle>
            <CardContent>
              <DSITable 
                dateUpTo={filters.dateUpTo}
                brand={filters.brand || undefined}
                ir={filters.ir || undefined}
                sku={filters.sku || undefined}
              />
            </CardContent>
          </CardContainer>
        </BentoItem>
      </BentoGrid>
    </Box>
  );
};

export default COGSDetails; 