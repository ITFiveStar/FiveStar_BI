import React, { useState, useEffect } from 'react';
import { Box, Paper, styled, Typography, CircularProgress, TextField, Autocomplete, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
import axios from 'axios';

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

// Card components based on the COGS Details page
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
  position: 'relative',
  minHeight: '30px',
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
  minWidth: '120px',
}));

// Styled table components
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderBottom: '1px solid #f0f0f0',
  fontSize: '0.85rem',
  height: '40px',
}));

const StyledHeaderTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderBottom: '1px solid #e0e0e0',
  fontSize: '0.85rem',
  backgroundColor: '#f5f8fa',
  fontWeight: 600,
  color: '#000000',
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:hover': {
    backgroundColor: '#f0f7ff',
  },
}));

// Custom styles for smaller dropdowns
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
  if (amount === undefined || amount === null || amount === 0) return '$0';
  
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

// Format percentage for display
const formatPercentage = (value: number | undefined): string => {
  if (value === undefined || value === null) return '0.0%';
  return `${value.toFixed(1)}%`;
};

// Interface for profitability data
interface ProfitabilityData {
  performance_weeks: string[];
  performance_week_display: string;
  net_profit_data: Array<{ sku: string; net_profit: number }>;
  net_profit_percentage_data: Array<{ sku: string; net_profit_percentage: number }>;
  total_revenue_data: Array<{ sku: string; total_revenue: number }>;
  ranking_data: Array<{
    sku: string;
    net_profit_rank: number;
    net_profit_percentage_rank: number;
    total_revenue_rank: number;
    overall_rank: number;
  }>;
}

const ProfitabilityReport: React.FC = () => {
  // Filter states
  const [performanceWeeks, setPerformanceWeeks] = useState<string[]>([]);
  
  // Available week options
  const [weekOptions, setWeekOptions] = useState<string[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(true);
  
  // Profitability data
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityData | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch week options
  useEffect(() => {
    const fetchWeekOptions = async () => {
      try {
        setLoadingWeeks(true);
        const response = await axios.get('/profitability_report_weeks');
        if (response.data.status === 'success') {
          const weeks = response.data.weeks || [];
          setWeekOptions(weeks);
          
          // Set default to the biggest (latest) week value
          if (weeks.length > 0 && performanceWeeks.length === 0) {
            const latestWeek = weeks[weeks.length - 1]; // Since weeks are sorted, last one is the latest
            setPerformanceWeeks([latestWeek]);
          }
        }
      } catch (error) {
        console.error('Error fetching week options:', error);
      } finally {
        setLoadingWeeks(false);
      }
    };

    fetchWeekOptions();
  }, []);

  // Fetch profitability data
  useEffect(() => {
    const fetchProfitabilityData = async () => {
      try {
        setLoadingData(true);
        setError(null);
        
        // Build URL with parameters
        let url = '/profitability_report_data';
        const params = new URLSearchParams();
        
        if (performanceWeeks.length > 0) {
          params.append('performanceWeeks', performanceWeeks.join(','));
        }
        
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        
        const response = await axios.get(url);
        if (response.data.status === 'success') {
          setProfitabilityData(response.data);
        } else {
          setError(response.data.error || 'Failed to fetch data');
        }
      } catch (error: any) {
        console.error('Error loading profitability data:', error);
        setError(error.response?.data?.error || 'No data available for the selected week.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchProfitabilityData();
  }, [performanceWeeks]);

  // Generate filename based on selected weeks
  const generateFilename = (): string => {
    if (performanceWeeks.length === 0) return 'Profitability Report';
    
    const sortedWeeks = [...performanceWeeks].sort();
    const smallestWeek = sortedWeeks[0];
    const largestWeek = sortedWeeks[sortedWeeks.length - 1];
    
    const smallestLeft10 = smallestWeek.substring(0, 10);
    const largestRight10 = largestWeek.substring(largestWeek.length - 10);
    
    return `Profitability Report ${smallestLeft10} - ${largestRight10}`;
  };

  // Generate HTML file
  const generateHTML = (): string => {
    if (!profitabilityData) return '';

    const weekDisplay = profitabilityData.performance_week_display;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${generateFilename()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .header h1 {
            color: #47709B;
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .filter-info {
            color: #666;
            font-size: 16px;
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 2fr;
            gap: 16px;
            height: calc(100vh - 200px);
            min-height: 600px;
        }
        .card {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            border: 1px solid #e0e0e0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .card-title {
            background-color: #fefefe;
            padding: 16px 16px 12px 16px;
            font-weight: 600;
            color: #47709B;
            font-size: 16px;
            border-bottom: 1px solid #f0f0f0;
            flex-shrink: 0;
        }
        .card-content {
            padding: 0;
            flex: 1;
            overflow: auto;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
        }
        .table th {
            background-color: #f5f8fa;
            padding: 8px 16px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 13.6px;
            font-weight: 600;
            color: #000000;
            text-align: left;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .table th.right { text-align: right; }
        .table th.center { text-align: center; }
        .table td {
            padding: 8px 16px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 13.6px;
            height: 40px;
            vertical-align: middle;
        }
        .table td.right { text-align: right; }
        .table td.center { text-align: center; }
        .table tbody tr:hover {
            background-color: #f0f7ff;
        }
        .overall-rank {
            font-weight: 600;
            color: #47709B;
        }
        /* Custom scrollbar */
        .card-content::-webkit-scrollbar {
            width: 8px;
        }
        .card-content::-webkit-scrollbar-track {
            background: #f1f1f1;
        }
        .card-content::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
        }
        .card-content::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Profitability Report</h1>
        <div class="filter-info">Performance Week(s): ${weekDisplay}</div>
    </div>
    
    <div class="container">
        <!-- Net Profit Table -->
        <div class="card">
            <div class="card-title">Net Profit</div>
            <div class="card-content">
                <table class="table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th class="right">Net Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${profitabilityData.net_profit_data.map(row => `
                            <tr>
                                <td>${row.sku}</td>
                                <td class="right">${formatCurrency(row.net_profit)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Net Profit Margin Table -->
        <div class="card">
            <div class="card-title">Net Profit Margin</div>
            <div class="card-content">
                <table class="table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th class="right">Net Profit Margin</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${profitabilityData.net_profit_percentage_data.map(row => `
                            <tr>
                                <td>${row.sku}</td>
                                <td class="right">${formatPercentage(row.net_profit_percentage)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Total Revenue Table -->
        <div class="card">
            <div class="card-title">Total Revenue</div>
            <div class="card-content">
                <table class="table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th class="right">Total Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${profitabilityData.total_revenue_data.map(row => `
                            <tr>
                                <td>${row.sku}</td>
                                <td class="right">${formatCurrency(row.total_revenue)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Rankings Table -->
        <div class="card">
            <div class="card-title">Overall Rankings</div>
            <div class="card-content">
                <table class="table">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th class="center">Profit Rank</th>
                            <th class="center">Margin Rank</th>
                            <th class="center">Revenue Rank</th>
                            <th class="center">Overall Rank</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${profitabilityData.ranking_data.map(row => `
                            <tr>
                                <td>${row.sku}</td>
                                <td class="center">${row.net_profit_rank}</td>
                                <td class="center">${row.net_profit_percentage_rank}</td>
                                <td class="center">${row.total_revenue_rank}</td>
                                <td class="center overall-rank">${row.overall_rank}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>`;
  };

  // Download file helper
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle download
  const handleDownload = () => {
    if (!profitabilityData) {
      alert('No data available to download');
      return;
    }

    const htmlContent = generateHTML();
    const filename = generateFilename();
    downloadFile(htmlContent, filename);
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
        {/* Row 1: Header row - spans full width */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 7', 
            gridRow: 'span 1', 
          }}
        >
          <CardContainer>
            <CardContent>
              {loadingWeeks ? (
                <Box sx={{ display: 'flex', height: '100%', width: '100%'}}>
                  <CircularProgress size={24} />
                </Box>
                              ) : (
                  <Box sx={{display: 'flex', width: '100%', alignItems: 'center', gap: 2}}>
                    <FilterContainer sx={{ flex: 1 }}>
                      <FilterLabel>Performance Week:</FilterLabel>
                      <Autocomplete
                        multiple
                        size="small"
                        options={weekOptions}
                        value={performanceWeeks}
                        onChange={(event, newValue) => {
                          setPerformanceWeeks(newValue as string[]);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select Weeks"
                            size="small"
                            variant="outlined"
                            InputProps={{
                              ...params.InputProps,
                              style: { 
                                fontSize: '0.85rem', 
                                padding: '0px',
                              },
                            }}
                            sx={{
                              '& .MuiInputBase-root': {
                                padding: '0px 14px 0px 0px',
                                minHeight: '32px',
                              },
                              '& .MuiOutlinedInput-input': {
                                padding: '4px 14px',
                              },
                              '& .MuiInputBase-input::placeholder': {
                                color: '#9e9e9e',
                                opacity: 1,
                              },
                              '& .MuiAutocomplete-tag': {
                                fontSize: '0.75rem',
                                height: '24px',
                                margin: '2px',
                              },
                            }}
                          />
                        )}
                        sx={{ flex: 1, minWidth: 300 }}
                        renderOption={(props, option) => (
                          <MenuItem {...props} sx={menuItemSx}>
                            {option}
                          </MenuItem>
                        )}
                      />
                    </FilterContainer>
                    <Button
                      variant="contained"
                      onClick={handleDownload}
                      disabled={!profitabilityData || loadingData}
                      sx={{
                        backgroundColor: '#47709B',
                        color: 'white',
                        fontSize: '0.85rem',
                        padding: '6px 16px',
                        minWidth: '100px',
                        '&:hover': {
                          backgroundColor: '#365580',
                        },
                        '&:disabled': {
                          backgroundColor: '#cccccc',
                          color: '#666666',
                        },
                      }}
                    >
                      Download
                    </Button>
                  </Box>
                )}
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Row 2: Content area - divided into 4 columns */}
        
        {/* Column 1: Net Profit Table - 20% */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '1 / 2', 
            gridRow: 'span 15',
          }}
        >
          <CardContainer>
            <CardTitle>
              Net Profit
            </CardTitle>
            <CardContent>
              {loadingData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary" align="center">
                    {error}
                  </Typography>
                </Box>
              ) : profitabilityData ? (
                <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <StyledHeaderTableCell>SKU</StyledHeaderTableCell>
                        <StyledHeaderTableCell align="right">Net Profit</StyledHeaderTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profitabilityData.net_profit_data.map((row, index) => (
                        <StyledTableRow key={index}>
                          <StyledTableCell>{row.sku}</StyledTableCell>
                          <StyledTableCell align="right">{formatCurrency(row.net_profit)}</StyledTableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography align="center">No data available</Typography>
              )}
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Column 2: Net Profit Margin Table - 20% */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '2 / 3', 
            gridRow: 'span 15',
          }}
        >
          <CardContainer>
            <CardTitle>
              Net Profit Margin
            </CardTitle>
            <CardContent>
              {loadingData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary" align="center">
                    {error}
                  </Typography>
                </Box>
              ) : profitabilityData ? (
                <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <StyledHeaderTableCell>SKU</StyledHeaderTableCell>
                        <StyledHeaderTableCell align="right">Net Profit Margin</StyledHeaderTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profitabilityData.net_profit_percentage_data.map((row, index) => (
                        <StyledTableRow key={index}>
                          <StyledTableCell>{row.sku}</StyledTableCell>
                          <StyledTableCell align="right">{formatPercentage(row.net_profit_percentage)}</StyledTableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography align="center">No data available</Typography>
              )}
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Column 3: Total Revenue Table - 20% */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '3 / 4', 
            gridRow: 'span 15',
          }}
        >
          <CardContainer>
            <CardTitle>
              Total Revenue
            </CardTitle>
            <CardContent>
              {loadingData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary" align="center">
                    {error}
                  </Typography>
                </Box>
              ) : profitabilityData ? (
                <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <StyledHeaderTableCell>SKU</StyledHeaderTableCell>
                        <StyledHeaderTableCell align="right">Total Revenue</StyledHeaderTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profitabilityData.total_revenue_data.map((row, index) => (
                        <StyledTableRow key={index}>
                          <StyledTableCell>{row.sku}</StyledTableCell>
                          <StyledTableCell align="right">{formatCurrency(row.total_revenue)}</StyledTableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography align="center">No data available</Typography>
              )}
            </CardContent>
          </CardContainer>
        </BentoItem>

        {/* Column 4: Rankings Table - 40% */}
        <BentoItem 
          className="bento-item"
          sx={{ 
            gridColumn: '4 / 7', 
            gridRow: 'span 15',
          }}
        >
          <CardContainer>
            <CardTitle>
              Overall Rankings
            </CardTitle>
            <CardContent>
              {loadingData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography color="text.secondary" align="center">
                    {error}
                  </Typography>
                </Box>
              ) : profitabilityData ? (
                <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <StyledHeaderTableCell>SKU</StyledHeaderTableCell>
                        <StyledHeaderTableCell align="center">Profit Rank</StyledHeaderTableCell>
                        <StyledHeaderTableCell align="center">Margin Rank</StyledHeaderTableCell>
                        <StyledHeaderTableCell align="center">Revenue Rank</StyledHeaderTableCell>
                        <StyledHeaderTableCell align="center">Overall Rank</StyledHeaderTableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profitabilityData.ranking_data.map((row, index) => (
                        <StyledTableRow key={index}>
                          <StyledTableCell>{row.sku}</StyledTableCell>
                          <StyledTableCell align="center">{row.net_profit_rank}</StyledTableCell>
                          <StyledTableCell align="center">{row.net_profit_percentage_rank}</StyledTableCell>
                          <StyledTableCell align="center">{row.total_revenue_rank}</StyledTableCell>
                          <StyledTableCell align="center" sx={{ fontWeight: 600, color: '#47709B' }}>
                            {row.overall_rank}
                          </StyledTableCell>
                        </StyledTableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography align="center">No data available</Typography>
              )}
            </CardContent>
          </CardContainer>
        </BentoItem>
      </BentoGrid>
    </Box>
  );
};

export default ProfitabilityReport;
