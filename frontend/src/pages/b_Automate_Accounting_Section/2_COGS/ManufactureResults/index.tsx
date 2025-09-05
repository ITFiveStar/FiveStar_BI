import React, { useEffect, useState, useMemo } from 'react';
import { 
  DataGrid, 
  GridColDef, 
  getGridDateOperators 
} from '@mui/x-data-grid';
import { 
  Alert, 
  Snackbar, 
  Tabs, 
  Tab, 
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Grid,
  Typography,
  styled
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isAfter, isBefore } from 'date-fns';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import BuildIcon from '@mui/icons-material/Build';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BasePage from '../../../../components/common/BasePage';
import ToolbarActions from '../../../../components/common/DataGrid/ToolbarActions';
import { manufactureResultService, LatestManufactureResult, ManufactureResultStatus } from '../../../../services/manufactureResultService';
import { stockExchangeService } from '../../../../services/stockExchangeService';
import { ManufactureResult, FailedManufactureResult } from '../../../../types/manufactureResult';
import { FailedStockExchange } from '../../../../types/stockExchange';
import { dataGridStyles } from '../../../../components/common/DataGrid/styles';
import { exportToCsv } from '../../../../utils/exportToCsv';
import DownloadIcon from '@mui/icons-material/Download';

// Card styled components
const CardContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#fefefe',
  padding: theme.spacing(2),
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  marginBottom: theme.spacing(2),
  border: '1px solid #e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
}));

const CardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: '#47709B',
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  '& svg': {
    marginRight: theme.spacing(1),
    color: '#47709B',
  }
}));

const CardContent = styled(Box)(({ theme }) => ({
  fontSize: '0.9rem',
  color: '#666',
  marginBottom: theme.spacing(1),
  flexGrow: 1,
}));

const manufactureResultColumns: GridColDef[] = [
  { 
    field: 'manufacture_order_id', 
    headerName: 'MO ID', 
    flex: 0.5,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'manufacture_batch', 
    headerName: 'Batch', 
    flex: 0.5,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'sku', 
    headerName: 'SKU', 
    flex: 2.1,
    minWidth: 200,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'product', 
    headerName: 'Product', 
    flex: 1.2,
    minWidth: 150,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'fulfilled_by_po', 
    headerName: 'PO ID', 
    flex: 1,
    minWidth: 120,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'fulfilled_quantity', 
    headerName: 'Quantity', 
    flex: 0.8,
    minWidth: 100,
    type: 'number',
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
  },
  { 
    field: 'cost', 
    headerName: 'Cost', 
    flex: 0.8,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => Number(params.value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  },
  { 
    field: 'unit_cost', 
    headerName: 'Unit Cost', 
    flex: 0.8,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => Number(params.value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  },
  { 
    field: 'manufacture_completion_date', 
    headerName: 'Completion Date', 
    flex: 1,
    minWidth: 130,
    type: 'date',
    headerAlign: 'left',
    align: 'left',
    valueGetter: (params) => new Date(params.value.split('T')[0]),
    valueFormatter: (params) => params.value?.toISOString().split('T')[0] || '',
    filterOperators: getGridDateOperators()
  },
  { 
    field: 'status', 
    headerName: 'Status', 
    flex: 0.8,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'quantity_left', 
    headerName: 'Remaining', 
    flex: 0.8,
    minWidth: 100,
    type: 'number',
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
  }
];

const failedResultColumns: GridColDef[] = [
  { 
    field: 'manufacture_order_id', 
    headerName: 'MO ID', 
    flex: 0.8,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'SKU', 
    headerName: 'SKU', 
    flex: 1.5,
    minWidth: 200,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'product', 
    headerName: 'Product', 
    flex: 1.2,
    minWidth: 150,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'manufacture_date', 
    headerName: 'Manufacture Date', 
    flex: 1,
    minWidth: 130,
    type: 'date',
    headerAlign: 'left',
    align: 'left',
    valueGetter: (params) => new Date(params.value.split('T')[0]),
    valueFormatter: (params) => params.value?.toISOString().split('T')[0] || '',
    filterOperators: getGridDateOperators()
  },
  { 
    field: 'failure_reason', 
    headerName: 'Failure Reason', 
    flex: 1.5,
    minWidth: 200,
    headerAlign: 'left',
    align: 'left',
  }
];

// Failed Stock Exchange columns
const failedExchangeColumns: GridColDef[] = [
  { 
    field: 'SKU_original', 
    headerName: 'Original SKU', 
    flex: 1.5,
    minWidth: 200,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'SKU_new', 
    headerName: 'New SKU', 
    flex: 1.5,
    minWidth: 200,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'quantity', 
    headerName: 'Exchange Quantity', 
    flex: 1,
    minWidth: 130,
    type: 'number',
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
  },
  { 
    field: 'exchange_date', 
    headerName: 'Exchange Date', 
    flex: 1,
    minWidth: 130,
    type: 'date',
    headerAlign: 'left',
    align: 'left',
    valueGetter: (params) => new Date(params.value.split('T')[0]),
    valueFormatter: (params) => params.value?.toISOString().split('T')[0] || '',
    filterOperators: getGridDateOperators()
  },
  { 
    field: 'failure_reason', 
    headerName: 'Failure Reason', 
    flex: 1.5,
    minWidth: 200,
    headerAlign: 'left',
    align: 'left',
  }
];

const ManufactureResults: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [manufactureResults, setManufactureResults] = useState<ManufactureResult[]>([]);
  const [failedResults, setFailedResults] = useState<FailedManufactureResult[]>([]);
  const [failedExchanges, setFailedExchanges] = useState<FailedStockExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Latest manufacture result state
  const [latestResult, setLatestResult] = useState<LatestManufactureResult | null>(null);
  
  // Status check state
  const [status, setStatus] = useState<ManufactureResultStatus | null>(null);
  
  // Date range filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [results, failed, failedStockExchanges] = await Promise.all([
        manufactureResultService.getAll(),
        manufactureResultService.getAllFailed(),
        stockExchangeService.getAllFailed()
      ]);
      setManufactureResults(results);
      setFailedResults(failed);
      setFailedExchanges(failedStockExchanges);
      
      // Load latest manufacture result
      loadLatestResult();
      
      // Check status
      checkStatus();
    } catch (error) {
      showSnackbar('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const loadLatestResult = async () => {
    try {
      const data = await manufactureResultService.getLatest();
      setLatestResult(data);
    } catch (error) {
      console.error('Error loading latest manufacture result:', error);
      // Don't show a snackbar for this as it's not critical
    }
  };
  
  const checkStatus = async () => {
    try {
      const data = await manufactureResultService.checkStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error checking manufacture result status:', error);
      // Don't show a snackbar for this as it's not critical
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const { manufactureResults: results, failedResults: failed } = await manufactureResultService.generate();
      setManufactureResults(results);
      setFailedResults(failed);
      // Reload latest result and check status
      await loadLatestResult();
      await checkStatus();
      showSnackbar('Results generated successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to generate results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshWithStockExchange = async () => {
    try {
      setLoading(true);
      const { manufactureResults: results, failedResults: failed } = await manufactureResultService.refreshWithStockExchange();
      setManufactureResults(results);
      setFailedResults(failed);
      
      // Reload failed stock exchanges
      const failedStockExchanges = await stockExchangeService.getAllFailed();
      setFailedExchanges(failedStockExchanges);
      
      // Reload latest result and check status
      await loadLatestResult();
      await checkStatus();
      
      showSnackbar('Results refreshed with stock exchange successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to refresh results with stock exchange', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      await manufactureResultService.deleteAll();
      setManufactureResults([]);
      setFailedResults([]);
      setFailedExchanges([]);
      setLatestResult(null);
      await checkStatus();
      setConfirmDialogOpen(false);
      showSnackbar('All results deleted successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to delete results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (activeTab === 0) {
    // Download successful manufacture results
    exportToCsv(
      manufactureResultColumns, 
      filteredManufactureResults, 
      'successful_manufacture_results'
    );
    } else if (activeTab === 1) {
      // Download failed manufacture results
      exportToCsv(
        failedResultColumns, 
        filteredFailedResults, 
        'failed_manufacture_results'
      );
    } else if (activeTab === 2) {
      // Download failed stock exchanges
      exportToCsv(
        failedExchangeColumns, 
        filteredFailedExchanges, 
        'failed_stock_exchanges'
      );
    }
  };

  const filteredManufactureResults = useMemo(() => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    return manufactureResults.filter(result => {
      const searchLower = searchText.toLowerCase();
      
      // Text search filtering
      const matchesSearch = !searchText ||
        result.manufacture_order_id.toString().includes(searchLower) ||
        result.SKU.toLowerCase().includes(searchLower) ||
        result.product.toLowerCase().includes(searchLower) ||
        result.fulfilled_by_PO.toLowerCase().includes(searchLower) ||
        result.manufacture_completion_date === searchText;
      
      // Date range filtering using string comparison
      const completionDateStr = result.manufacture_completion_date.split('T')[0]; // Get YYYY-MM-DD part
      const matchesDateRange = !startDateStr || !endDateStr || 
        (completionDateStr >= startDateStr && completionDateStr <= endDateStr);
      
      return matchesSearch && matchesDateRange;
    });
  }, [manufactureResults, searchText, startDate, endDate]);

  const filteredFailedResults = useMemo(() => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    return failedResults.filter(result => {
      const searchLower = searchText.toLowerCase();
      
      // Text search filtering
      const matchesSearch = !searchText ||
        result.manufacture_order_id.toString().includes(searchLower) ||
        result.SKU.toLowerCase().includes(searchLower) ||
        result.product.toLowerCase().includes(searchLower) ||
        result.manufacture_date === searchText;
      
      // Date range filtering using string comparison
      const manufactureDateStr = result.manufacture_date.split('T')[0]; // Get YYYY-MM-DD part
      const matchesDateRange = !startDateStr || !endDateStr || 
        (manufactureDateStr >= startDateStr && manufactureDateStr <= endDateStr);
      
      return matchesSearch && matchesDateRange;
    });
  }, [failedResults, searchText, startDate, endDate]);

  const filteredFailedExchanges = useMemo(() => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    return failedExchanges.filter(exchange => {
      const searchLower = searchText.toLowerCase();
      
      // Text search filtering
      const matchesSearch = !searchText ||
        exchange.SKU_original.toLowerCase().includes(searchLower) ||
        exchange.SKU_new.toLowerCase().includes(searchLower) ||
        exchange.exchange_date === searchText;
      
      // Date range filtering using string comparison
      const exchangeDateStr = exchange.exchange_date.split('T')[0]; // Get YYYY-MM-DD part
      const matchesDateRange = !startDateStr || !endDateStr || 
        (exchangeDateStr >= startDateStr && exchangeDateStr <= endDateStr);
      
      return matchesSearch && matchesDateRange;
    });
  }, [failedExchanges, searchText, startDate, endDate]);

  // Get search placeholder based on active tab
  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 0:
        return 'Quick search by MO ID, SKU, Product, PO ID, or Completion Date (YYYY-MM-DD)';
      case 1:
        return 'Quick search by MO ID, SKU, Product, or Manufacture Date (YYYY-MM-DD)';
      case 2:
        return 'Quick search by Original SKU, New SKU, or Exchange Date (YYYY-MM-DD)';
      default:
        return 'Search...';
    }
  };

  return (
    <BasePage>
      {/* Cards Section */}
      <Box sx={{ height: '25%', maxHeight: '200px', mb: 2, mt: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Card 1: Latest Manufacture Result */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest Manufacture Result
              </CardTitle>
              <CardContent>
                {latestResult ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      MO{latestResult.manufacture_order_id} 
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestResult.SKU} {parseInt(latestResult.quantity).toLocaleString()} units
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestResult.manufacture_completion_date}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No manufacture results available</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>

          {/* Card 2: Display Period */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <CalendarMonthIcon fontSize="small" />
                Display Period
              </CardTitle>
              <CardContent>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <DatePicker
                        label="Start Date"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        format="yyyy-MM-dd"
                        slotProps={{ 
                          textField: { 
                            size: "small",
                            fullWidth: true,
                            placeholder: 'YYYY-MM-DD',
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
                        maxDate={endDate || undefined}
                        shouldDisableDate={(date) => 
                          endDate ? isAfter(date, endDate) : false
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <DatePicker
                        label="End Date"
                        value={endDate}
                        onChange={(newValue) => setEndDate(newValue)}
                        format="yyyy-MM-dd"
                        slotProps={{ 
                          textField: { 
                            size: "small",
                            fullWidth: true,
                            placeholder: 'YYYY-MM-DD',
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
                        minDate={startDate || undefined}
                        shouldDisableDate={(date) => 
                          startDate ? isBefore(date, startDate) : false
                        }
                      />
                    </Grid>
                  </Grid>
                </LocalizationProvider>
              </CardContent>
            </CardContainer>
          </Grid>
          
          {/* Card 3: Action Guider */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <AssignmentTurnedInIcon fontSize="small" />
                Action Guider
              </CardTitle>
              <CardContent>
                {status ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mb={1} mt={1}>
                      {status.all_manufacture_costs_generated && status.all_stock_exchange_generated ? (
                        "No Action Needed"
                      ) : (
                        "Take Action"
                      )}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      Cost Calculated for All Manufacture Orders: {status.all_manufacture_costs_generated ? (
                        <span style={{ color: 'green' }}>Yes</span>
                      ) : (
                        <span style={{ color: 'red' }}>No</span>
                      )}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      Stock Exchange Refreshed for All Requests: {status.all_stock_exchange_generated ? (
                        <span style={{ color: 'green' }}>Yes</span>
                      ) : (
                        <span style={{ color: 'red' }}>No</span>
                      )}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2">Loading status information...</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 1.5, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<BuildIcon />}
          onClick={handleGenerate}
        >
          Generate
        </Button>
        <Button
          variant="contained"
          startIcon={<AutorenewIcon />}
          onClick={handleRefreshWithStockExchange}
        >
          Refresh with Stock Exchange
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setConfirmDialogOpen(true)}
        >
          Delete All
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
        >
          Download
        </Button>
      </Box>

      <Box sx={{ width: '100%', mb: 3 }}>
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
              textTransform: 'none',
              minWidth: 120,
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
            pl: 0
          }}
          TabIndicatorProps={{
            sx: { height: 3 }
          }}
        >
          <Tab label="Manufacture Results" sx={{ pl: 0, ml: 0 }} />
          <Tab label="Failed Manufacture Orders" />
          <Tab label="Failed Stock Exchanges" />
        </Tabs>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={getSearchPlaceholder()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: '100%' }}
          fullWidth
        />
      </Box>

      {activeTab === 0 && (
        <DataGrid
          rows={filteredManufactureResults}
          columns={manufactureResultColumns}
          loading={loading}
          getRowId={(row) => row.result_id}
          autoHeight
          initialState={{
            pagination: { paginationModel: { pageSize: 9 } },
            columns: {
              columnVisibilityModel: {}
            },
          }}
          sx={dataGridStyles}
        />
      )}

      {activeTab === 1 && (
        <DataGrid
          rows={filteredFailedResults}
          columns={failedResultColumns}
          loading={loading}
          getRowId={(row) => row.id}
          autoHeight
          initialState={{
            pagination: { paginationModel: { pageSize: 9 } },
            columns: {
              columnVisibilityModel: {}
            },
          }}
          sx={dataGridStyles}
        />
      )}

      {activeTab === 2 && (
        <DataGrid
          rows={filteredFailedExchanges}
          columns={failedExchangeColumns}
          loading={loading}
          getRowId={(row) => row.id}
          autoHeight
          initialState={{
            pagination: { paginationModel: { pageSize: 9 } },
            columns: {
              columnVisibilityModel: {}
            },
          }}
          sx={dataGridStyles}
        />
      )}

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Delete All Results</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete all manufacture results, failed results, failed stock exchanges warnings, and related COGS records. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteAll} color="error" variant="contained">
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </BasePage>
  );
};

export default ManufactureResults; 