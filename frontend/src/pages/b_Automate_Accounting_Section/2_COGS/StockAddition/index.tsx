import React, { useEffect, useState, useMemo } from 'react';
import { DataGrid, GridColDef, getGridDateOperators } from '@mui/x-data-grid';
import { 
  Alert, 
  Snackbar, 
  Box, 
  Button, 
  TextField, 
  InputAdornment, 
  Tabs, 
  Tab,
  Grid,
  Typography,
  styled
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isAfter, isBefore } from 'date-fns';
import BasePage from '../../../../components/common/BasePage';
import { stockAdditionService } from '../../../../services/stockAdditionService';
import { stockExchangeService } from '../../../../services/stockExchangeService';
import type { StockAddition } from '../../../../types/stockAddition';
import type { StockExchange } from '../../../../types/stockExchange';
import ConfirmDialog from '../../../../components/common/ConfirmDialog';
import { dataGridStyles } from '../../../../components/common/DataGrid/styles';
import { exportToCsv } from '../../../../utils/exportToCsv';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import StockAdditionDialog from './StockAdditionDialog';
import StockExchangeDialog from '../StockExchange/StockExchangeDialog';
import BulkUploadDialog from './BulkUploadDialog';
import StockExchangeBulkUploadDialog from '../StockExchange/BulkUploadDialog';

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

// Interfaces for latest records
interface LatestStockAddition {
  SKU: string;
  manufacture_completion_date: string;
  fulfilled_quantity: string;
  cost: string;
}

interface LatestStockExchange {
  SKU_original: string;
  SKU_new: string;
  quantity: string;
  exchange_date: string;
}

// Stock Addition columns
const stockAdditionColumns: GridColDef[] = [
  { 
    field: 'SKU', 
    headerName: 'SKU', 
    flex: 1.5,
    minWidth: 200,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'fulfilled_quantity', 
    headerName: 'Addition Quantity', 
    flex: 1,
    minWidth: 130,
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
    valueFormatter: (params) => {
      if (params.value == null) return '';
      return Number(params.value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  },
  { 
    field: 'unit_cost', 
    headerName: 'Unit Cost', 
    flex: 0.8,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => {
      if (params.value == null) return '';
      return Number(params.value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  },
  { 
    field: 'manufacture_completion_date', 
    headerName: 'Addition Date', 
    flex: 1,
    minWidth: 120,
    type: 'date',
    headerAlign: 'left',
    align: 'left',
    valueGetter: (params) => {
      return new Date(params.value.split('T')[0]);
    },
    valueFormatter: (params) => {
      return params.value?.toISOString().split('T')[0] || '';
    },
    filterOperators: getGridDateOperators()
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

// Stock Exchange columns
const stockExchangeColumns: GridColDef[] = [
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
    minWidth: 120,
    type: 'date',
    headerAlign: 'left',
    align: 'left',
    valueGetter: (params) => new Date(params.value.split('T')[0]),
    valueFormatter: (params) => params.value?.toISOString().split('T')[0] || '',
    filterOperators: getGridDateOperators()
  }
];

const StockManagement: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Stock Addition states
  const [stockAdditions, setStockAdditions] = useState<StockAddition[]>([]);
  const [selectedAdditions, setSelectedAdditions] = useState<StockAddition[]>([]);
  const [additionDialogOpen, setAdditionDialogOpen] = useState(false);
  const [additionBulkUploadOpen, setAdditionBulkUploadOpen] = useState(false);
  const [latestAddition, setLatestAddition] = useState<LatestStockAddition | null>(null);
  
  // Stock Exchange states
  const [stockExchanges, setStockExchanges] = useState<StockExchange[]>([]);
  const [selectedExchanges, setSelectedExchanges] = useState<StockExchange[]>([]);
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const [exchangeBulkUploadOpen, setExchangeBulkUploadOpen] = useState(false);
  const [latestExchange, setLatestExchange] = useState<LatestStockExchange | null>(null);
  
  // Date range filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Common states
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stock additions
      const additionData = await stockAdditionService.getAll();
      setStockAdditions(additionData);
      
      // Load stock exchanges only, not failed exchanges
      const exchanges = await stockExchangeService.getAll();
      setStockExchanges(exchanges);
      
      // Load latest stock addition
      loadLatestAddition();
      
      // Load latest stock exchange
      loadLatestExchange();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.error || 'Failed to load data',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const loadLatestAddition = async () => {
    try {
      const data = await stockAdditionService.getLatest();
      setLatestAddition(data);
    } catch (error) {
      console.error('Error loading latest stock addition:', error);
      // Don't show a snackbar for this as it's not critical
    }
  };
  
  const loadLatestExchange = async () => {
    try {
      const data = await stockExchangeService.getLatest();
      setLatestExchange(data);
    } catch (error) {
      console.error('Error loading latest stock exchange:', error);
      // Don't show a snackbar for this as it's not critical
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // Stock Addition handlers
  const handleAdditionDialogSubmit = async (data: any) => {
    try {
      await stockAdditionService.create(data);
      showSnackbar('Stock addition created successfully', 'success');
      setAdditionDialogOpen(false);
      loadData();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.error || 'Failed to create stock addition',
        'error'
      );
    }
  };

  const handleAdditionBulkUpload = async (data: any[]) => {
    try {
      await stockAdditionService.bulkUpload(data);
      showSnackbar('Stock additions uploaded successfully', 'success');
      setAdditionBulkUploadOpen(false);
      loadData();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Upload failed', 'error');
    }
  };

  const handleAdditionDelete = async () => {
    try {
      const result = await stockAdditionService.delete(selectedAdditions);
      
      if (result.failed_deletes.length > 0) {
        const errorMessages = result.failed_deletes
          .map(f => `${f.SKU}: ${f.error}`)
          .join('\n');
        
        showSnackbar(
          `Failed to delete some stock additions:\n${errorMessages}`,
          'error'
        );
      }

      if (result.success_deletes.length > 0) {
        showSnackbar('Selected stock additions deleted successfully', 'success');
      }

      setConfirmDialogOpen(false);
      setSelectedAdditions([]);
      loadData();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.error || 'Delete operation failed',
        'error'
      );
    }
  };

  // Stock Exchange handlers
  const handleExchangeDialogSubmit = async (data: any) => {
    try {
      await stockExchangeService.create(data);
      showSnackbar('Stock exchange created successfully', 'success');
      setExchangeDialogOpen(false);
      loadData();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.error || 'Failed to create stock exchange',
        'error'
      );
    }
  };

  const handleExchangeBulkUpload = async (data: any[]) => {
    try {
      await stockExchangeService.bulkUpload(data);
      showSnackbar('Stock exchanges uploaded successfully', 'success');
      setExchangeBulkUploadOpen(false);
      loadData();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Upload failed', 'error');
    }
  };

  const handleExchangeDelete = async () => {
    try {
      const result = await stockExchangeService.delete(selectedExchanges);
      
      if (result.failed_deletes.length > 0) {
        const errorMessages = result.failed_deletes
          .map(f => `${f.SKU_original} -> ${f.SKU_new}: ${f.error}`)
          .join('\n');
        
        showSnackbar(
          `Failed to delete some stock exchanges:\n${errorMessages}`,
          'error'
        );
      }

      if (result.success_deletes.length > 0) {
        showSnackbar('Selected stock exchanges deleted successfully', 'success');
      }

      setConfirmDialogOpen(false);
      setSelectedExchanges([]);
      loadData();
    } catch (error: any) {
      showSnackbar(
        error.response?.data?.error || 'Delete operation failed',
        'error'
      );
    }
  };

  // Generic handler function that calls the appropriate specific handler based on active tab
  const handleAdd = () => {
    if (activeTab === 0) {
      setAdditionDialogOpen(true);
    } else if (activeTab === 1) {
      setExchangeDialogOpen(true);
    }
  };

  const handleBulkUpload = () => {
    if (activeTab === 0) {
      setAdditionBulkUploadOpen(true);
    } else if (activeTab === 1) {
      setExchangeBulkUploadOpen(true);
    }
  };

  const handleDelete = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (activeTab === 0) {
      handleAdditionDelete();
    } else if (activeTab === 1) {
      handleExchangeDelete();
    }
  };

  const handleDownload = () => {
    if (activeTab === 0) {
      exportToCsv(stockAdditionColumns, filteredStockAdditions, 'stock_additions');
    } else if (activeTab === 1) {
      exportToCsv(stockExchangeColumns, filteredStockExchanges, 'stock_exchanges');
    }
  };

  // Filter functions for search
  const filteredStockAdditions = useMemo(() => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    return stockAdditions.filter(addition => {
      // Text search filtering
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText ||
        addition.SKU.toLowerCase().includes(searchLower) ||
        addition.manufacture_completion_date === searchText;
      
      // Apply date range filter using string comparison
      const additionDateStr = addition.manufacture_completion_date.split('T')[0]; // Get YYYY-MM-DD part
      const matchesDateRange = !startDateStr || !endDateStr || 
        (additionDateStr >= startDateStr && additionDateStr <= endDateStr);
      
      return matchesSearch && matchesDateRange;
    });
  }, [stockAdditions, searchText, startDate, endDate]);

  const filteredStockExchanges = useMemo(() => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    return stockExchanges.filter(exchange => {
      // Text search filtering
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText ||
        exchange.SKU_original.toLowerCase().includes(searchLower) ||
        exchange.SKU_new.toLowerCase().includes(searchLower) ||
        exchange.exchange_date === searchText;
      
      // Apply date range filter using string comparison
      const exchangeDateStr = exchange.exchange_date.split('T')[0]; // Get YYYY-MM-DD part
      const matchesDateRange = !startDateStr || !endDateStr || 
        (exchangeDateStr >= startDateStr && exchangeDateStr <= endDateStr);
      
      return matchesSearch && matchesDateRange;
    });
  }, [stockExchanges, searchText, startDate, endDate]);

  // Search placeholder text based on active tab
  const getSearchPlaceholder = () => {
    return activeTab === 0 
      ? 'Quick search by SKU or Addition Date (YYYY-MM-DD)'
      : 'Quick search by Original SKU, New SKU or Exchange Date (YYYY-MM-DD)';
  };

  // Get dialog title based on active tab
  const getDialogTitle = () => {
    if (activeTab === 0) {
      return selectedAdditions.length > 0 ? 'Delete Stock Additions' : 'Delete Stock Addition';
    } else {
      return selectedExchanges.length > 0 ? 'Delete Stock Exchanges' : 'Delete Stock Exchange';
    }
  };

  // Get dialog content based on active tab
  const getDialogContent = () => {
    if (activeTab === 0) {
      return `Are you sure you want to delete ${selectedAdditions.length} stock addition(s)?`;
    } else {
      return `Are you sure you want to delete ${selectedExchanges.length} stock exchange(s)?`;
    }
  };

  // Determine if delete button should be disabled
  const isDeleteDisabled = () => {
    if (activeTab === 0) {
      return selectedAdditions.length === 0;
    } else if (activeTab === 1) {
      return selectedExchanges.length === 0;
    }
    return true; // Disabled for failed exchanges tab
  };

  return (
    <BasePage>
      {/* Cards Section */}
      <Box sx={{ height: '25%', maxHeight: '200px', mb: 2, mt: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Card 1: Latest Stock Addition Record */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest Stock Addition Record
              </CardTitle>
              <CardContent>
                {latestAddition ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestAddition.SKU}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {parseInt(latestAddition.fulfilled_quantity).toLocaleString()} units ${parseFloat(latestAddition.cost).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestAddition.manufacture_completion_date}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No stock addition records available</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
          
          {/* Card 2: Latest Stock Exchange Record */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest Stock Exchange Record
              </CardTitle>
              <CardContent>
                {latestExchange ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestExchange.SKU_new}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      Exchanged from: {latestExchange.SKU_original}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {parseInt(latestExchange.quantity).toLocaleString()} units {latestExchange.exchange_date}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No stock exchange records available</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
          
          {/* Card 3: Display Period */}
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
        </Grid>
      </Box>

      <Box sx={{ mb: 1.5, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add
        </Button>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={handleBulkUpload}
        >
          Bulk Upload
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
          disabled={isDeleteDisabled()}
        >
          Delete
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
          <Tab label="Stock Addition" sx={{ pl: 0, ml: 0 }} />
          <Tab label="Stock Exchange" />
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
        rows={filteredStockAdditions}
          columns={stockAdditionColumns}
        loading={loading}
        getRowId={(row) => row.result_id}
        checkboxSelection
        disableRowSelectionOnClick
        autoHeight
        onRowSelectionModelChange={(newSelectionModel) => {
            setSelectedAdditions(stockAdditions.filter(addition => 
            newSelectionModel.includes(addition.result_id)
          ));
        }}
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
          rows={filteredStockExchanges}
          columns={stockExchangeColumns}
          loading={loading}
          getRowId={(row) => row.id}
          checkboxSelection
          disableRowSelectionOnClick
          autoHeight
          onRowSelectionModelChange={(newSelectionModel) => {
            setSelectedExchanges(stockExchanges.filter(exchange => 
              newSelectionModel.includes(exchange.id)
            ));
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 9 } },
            columns: {
              columnVisibilityModel: {}
            },
          }}
        sx={dataGridStyles}
      />
      )}

      {/* Stock Addition Dialogs */}
      <StockAdditionDialog
        open={additionDialogOpen}
        onClose={() => setAdditionDialogOpen(false)}
        onSubmit={handleAdditionDialogSubmit}
        title="Add Stock"
      />

      <BulkUploadDialog
        open={additionBulkUploadOpen}
        onClose={() => setAdditionBulkUploadOpen(false)}
        onUpload={handleAdditionBulkUpload}
      />

      {/* Stock Exchange Dialogs */}
      <StockExchangeDialog
        open={exchangeDialogOpen}
        onClose={() => setExchangeDialogOpen(false)}
        onSubmit={handleExchangeDialogSubmit}
        title="Stock Exchange"
      />

      <StockExchangeBulkUploadDialog
        open={exchangeBulkUploadOpen}
        onClose={() => setExchangeBulkUploadOpen(false)}
        onUpload={handleExchangeBulkUpload}
      />

      {/* Common Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={getDialogTitle()}
        content={getDialogContent()}
      />

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

export default StockManagement; 