import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Button, TextField, InputAdornment, Grid, Paper, styled, Tooltip } from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  CalendarMonth as CalendarMonthIcon,
  AutoFixHigh as AutoFixHighIcon,
  Refresh as RefreshIcon 
} from '@mui/icons-material';
import DownloadIcon from '@mui/icons-material/Download';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { dataGridStyles } from '../../../../components/common/DataGrid/styles';
import ConfirmDialog from '../../../../components/common/ConfirmDialog';
import BasePage from '../../../../components/common/BasePage';
import { useSnackbar } from 'notistack';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isAfter, isBefore } from 'date-fns';
import allOrdersPnLService from '../../../../services/allOrdersPnLService';
import { AllOrdersPnL } from '../../../../types/allOrdersPnL';

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

const AmazonAllOrdersPnL: React.FC = () => {
  // State for table data
  const [allOrdersPnLData, setAllOrdersPnLData] = useState<AllOrdersPnL[]>([]);
  
  // State for latest record data
  const [latestSalesRecord, setLatestSalesRecord] = useState<{ amazon_order_id: string; purchase_date_pst_pdt: string } | null>(null);
  const [latestStatementRecord, setLatestStatementRecord] = useState<{ settlement_id: string; deposit_date_pst_pdt: string; total_amount: string } | null>(null);
  
  // State for search terms
  const [searchText, setSearchText] = useState('');
  
  // State for confirm dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<'generate' | 'delete'>('delete');
  
  // State for loading
  const [loading, setLoading] = useState(false);

  // State for data updated
  const [dataUpdated, setDataUpdated] = useState(false);

  // State for snackbar
  const { enqueueSnackbar } = useSnackbar();

  // Date range filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch table data
        const response = await allOrdersPnLService.getAllOrdersPnL();
        setAllOrdersPnLData(response.map((item: AllOrdersPnL, index: number) => ({ ...item, id: item.id || index })));
        
        // Fetch latest records
        try {
          const latestSalesResponse = await allOrdersPnLService.getLatestSalesRecord();
          setLatestSalesRecord(latestSalesResponse);
        } catch (error) {
          console.log('No latest sales record found');
        }
        
        try {
          const latestStatementResponse = await allOrdersPnLService.getLatestStatementRecord();
          setLatestStatementRecord(latestStatementResponse);
        } catch (error) {
          console.log('No latest statement record found');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        enqueueSnackbar('Error loading data from server', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dataUpdated, enqueueSnackbar]);

  // Filter function based on search text and date range
  const filteredData = (): Array<Record<string, any>> => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    if (!searchText && (!startDateStr || !endDateStr)) {
      return allOrdersPnLData as Array<Record<string, any>>;
    }

    const lowerCaseSearch = searchText.toLowerCase();
    
    return allOrdersPnLData.filter(item => {
      // Text search filtering
      const matchesSearch = !searchText || 
        Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(lowerCaseSearch)
        );
      
      // Date range filtering - data_month_last_day
      let matchesDateRange = true;
      if (startDateStr && endDateStr && item.data_month_last_day) {
        const itemDateStr = item.data_month_last_day.toString().split('T')[0]; // Extract YYYY-MM-DD part
        matchesDateRange = itemDateStr >= startDateStr && itemDateStr <= endDateStr;
      }
      
      return matchesSearch && matchesDateRange;
    }) as Array<Record<string, any>>;
  };

  // Column definitions for DataGrid - including important fields from AllOrdersPnL
  const pnlColumns: GridColDef[] = [
    { 
      field: 'amazon_order_id', 
      headerName: 'Amazon Order ID', 
      flex: 1, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'sales_status', 
      headerName: 'Sales Status', 
      flex: 0.8, 
      minWidth: 100,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'payment_status', 
      headerName: 'Payment Status', 
      flex: 0.8, 
      minWidth: 100,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'return_status', 
      headerName: 'Return Status', 
      flex: 0.8, 
      minWidth: 100,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'product_type', 
      headerName: 'Product Type', 
      flex: 0.8, 
      minWidth: 100,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'sku', 
      headerName: 'SKU', 
      flex: 1.5, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'purchase_date_pst_pdt', 
      headerName: 'Purchase Date (PST/PDT)', 
      flex: 1, 
      minWidth: 170,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'data_month_last_day', 
      headerName: 'Month Last Day', 
      flex: 1, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'quantity', 
      headerName: 'Quantity', 
      flex: 0.5, 
      type: 'number', 
      minWidth: 80,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'currency', 
      headerName: 'Currency', 
      flex: 0.5, 
      minWidth: 80,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'item_price', 
      headerName: 'Item Price', 
      flex: 0.7, 
      minWidth: 90,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'commission', 
      headerName: 'Commission', 
      flex: 0.7, 
      minWidth: 90,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'sponsored_products_charge', 
      headerName: 'Ad Spend', 
      flex: 0.7, 
      minWidth: 90,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'fba_fulfillment_fee', 
      headerName: 'FBA Fee', 
      flex: 0.7, 
      minWidth: 90,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'fba_storage_fee', 
      headerName: 'Storage Fee', 
      flex: 0.7, 
      minWidth: 90,
      headerAlign: 'left',
      align: 'left'
    }
  ];

  // Handler for Generate button
  const handleGenerate = () => {
    setConfirmDialogAction('generate');
    setConfirmDialogOpen(true);
  };

  // Handler for Delete All button
  const handleDeleteAll = () => {
    setConfirmDialogAction('delete');
    setConfirmDialogOpen(true);
  };

  // Handler for confirm dialog
  const handleConfirmAction = () => {
    setLoading(true);
    if (confirmDialogAction === 'generate') {
      allOrdersPnLService.generateAllOrdersPnL()
        .then((response) => {
          enqueueSnackbar(response.message, { variant: 'success' });
          setDataUpdated(prev => !prev); // Trigger data refresh
        })
        .catch((error) => {
          console.error('Error generating AllOrdersPnL data:', error);
          enqueueSnackbar(`Error: ${error.response?.data?.error || 'Failed to generate AllOrdersPnL data'}`, { variant: 'error' });
        })
        .finally(() => {
          setLoading(false);
          setConfirmDialogOpen(false);
        });
    } else if (confirmDialogAction === 'delete') {
      allOrdersPnLService.deleteAllOrdersPnL()
        .then((response) => {
          enqueueSnackbar(response.message, { variant: 'success' });
          setDataUpdated(prev => !prev); // Trigger data refresh
        })
        .catch((error) => {
          console.error('Error deleting AllOrdersPnL data:', error);
          enqueueSnackbar(`Error: ${error.response?.data?.error || 'Failed to delete AllOrdersPnL data'}`, { variant: 'error' });
        })
        .finally(() => {
          setLoading(false);
          setConfirmDialogOpen(false);
        });
    }
  };

  // Handler for Download CSV button
  const handleDownloadCSV = () => {
    const data = filteredData();
    if (data.length === 0) return;
    
    // Create content - always using commas for CSV
    const headers = pnlColumns.map(col => col.headerName).join(',');
    const dataRows = data.map(item => 
      pnlColumns.map(col => {
        const value = item[col.field];
        // Format the value appropriately for CSV (handle commas, quotes)
        if (value === undefined || value === null) return '';
        const stringValue = String(value);
        // If the value contains commas or quotes, wrap it in quotes
        return stringValue.includes(',') || stringValue.includes('"') 
          ? `"${stringValue.replace(/"/g, '""')}"` 
          : stringValue;
      }).join(',')
    );
    
    const fileContent = [headers, ...dataRows].join('\n');
    const blob = new Blob([fileContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amazon_all_orders_pnl.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get proper confirmation dialog content
  const getConfirmDialogContent = () => {
    if (confirmDialogAction === 'generate') {
      return "Are you sure you want to generate new AllOrdersPnL data? This will replace all existing data.";
    } else {
      return "Are you sure you want to delete all AllOrdersPnL records?";
    }
  };

  return (
    <BasePage>
      {/* Summary Cards */}
      <Box sx={{ height: '25%', maxHeight: '200px', mb: 2, mt: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          <Grid item xs={12} sm={6} md={3} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest Sales Record
              </CardTitle>
              <CardContent>
                {latestSalesRecord ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestSalesRecord.amazon_order_id}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestSalesRecord.purchase_date_pst_pdt} (PST/PDT)
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No sales records available</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3} sx={{ height: '100%' }}>
            <CardContainer>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest Statement Record
              </CardTitle>
              <CardContent>
                {latestStatementRecord ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestStatementRecord.settlement_id}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestStatementRecord.deposit_date_pst_pdt}: ${Number(latestStatementRecord.total_amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No statement records available</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3} sx={{ height: '100%' }}>
            <CardContainer>
              <CardTitle variant="subtitle1">
                <AutoFixHighIcon fontSize="small" />
                Action Guider
              </CardTitle>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" fontSize="1rem" color="black" mt={1}>
                    1. Generate PnL Data
                  </Typography>
                  <Typography variant="body2" fontSize="1rem" color="black">
                    2. Review data in the table
                  </Typography>
                  <Typography variant="body2" fontSize="1rem" color="black">
                    3. Download the data if needed
                  </Typography>
                </Box>
              </CardContent>
            </CardContainer>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3} sx={{ height: '100%' }}>
            <Tooltip title="Set Display Period for PnL Data" placement="top">
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
            </Tooltip>
          </Grid>
        </Grid>
      </Box>

      {/* Action Buttons and Search */}
      <Box sx={{ mb: 1.5, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          startIcon={<RefreshIcon />}
          onClick={handleGenerate}
        >
          Generate
        </Button>
        <Button 
          variant="contained" 
          startIcon={<DeleteIcon />}
          color="error"
          onClick={handleDeleteAll}
        >
          Delete All
        </Button>
        <Button 
          variant="contained" 
          startIcon={<DownloadIcon />}
          onClick={handleDownloadCSV}
          disabled={filteredData().length === 0}
        >
          Download
        </Button>
      </Box>

      {/* Search Input */}
      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search all orders PnL data..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
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

      {/* Data Grid Section */}
      <DataGrid
        rows={filteredData()}
        columns={pnlColumns}
        autoHeight
        disableRowSelectionOnClick
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        loading={loading}
        sx={{ ...dataGridStyles, height: '100%', minHeight: '400px' }}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmAction}
        title={confirmDialogAction === 'generate' ? "Generate PnL Data" : "Delete All Records"}
        content={getConfirmDialogContent()}
      />
    </BasePage>
  );
};

export default AmazonAllOrdersPnL; 