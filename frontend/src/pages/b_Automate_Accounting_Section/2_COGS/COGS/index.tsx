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
import BasePage from '../../../../components/common/BasePage';
import ToolbarActions from '../../../../components/common/DataGrid/ToolbarActions';
import { cogsService } from '../../../../services/cogsService';
import { COGS, FailedCOGS } from '../../../../types/cogs';
import { dataGridStyles } from '../../../../components/common/DataGrid/styles';
import { exportToCsv } from '../../../../utils/exportToCsv';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

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

// Interface for latest COGS record
interface LatestCOGS {
  sales_date: string;
  sales_record_id: string;
  customer_name: string;
  SKU: string;
  cogs_value: string;
}

// Interface for COGS status
interface COGSStatus {
  all_cogs_generated: boolean;
}

const cogsColumns: GridColDef[] = [
  { 
    field: 'sales_record_id', 
    headerName: 'Sales Record ID', 
    flex: 1.2,
    minWidth: 180,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'sales_date', 
    headerName: 'Sales Date', 
    flex: 0.8,
    minWidth: 130,
    type: 'date',
    headerAlign: 'left',
    align: 'left',
    valueGetter: (params) => new Date(params.value.split('T')[0]),
    valueFormatter: (params) => params.value?.toISOString().split('T')[0] || '',
    filterOperators: getGridDateOperators()
  },
  { 
    field: 'sku', 
    headerName: 'SKU', 
    flex: 1.8,
    minWidth: 200,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'quantity_sold', 
    headerName: 'Quantity Sold', 
    flex: 0.8,
    minWidth: 120,
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
  },
  { 
    field: 'result_id', 
    headerName: 'MO ID', 
    flex: 0.5,
    minWidth: 80,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'manufacture_batch', 
    headerName: 'Batch', 
    flex: 0.5,
    minWidth: 80,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'product', 
    headerName: 'Product', 
    flex: 1,
    minWidth: 150,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'fulfilled_by_po', 
    headerName: 'PO ID', 
    flex: 1.2,
    minWidth: 120,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'cogs', 
    headerName: 'COGS', 
    flex: 0.7,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => Number(params.value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }
];

const failedCogsColumns: GridColDef[] = [
  { 
    field: 'sales_record_id', 
    headerName: 'Sales Record ID', 
    flex: 1.2,
    minWidth: 180,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'sales_date', 
    headerName: 'Sales Date', 
    flex: 0.8,
    minWidth: 130,
    type: 'date',
    headerAlign: 'left',
    align: 'left',
    valueGetter: (params) => new Date(params.value.split('T')[0]),
    valueFormatter: (params) => params.value?.toISOString().split('T')[0] || '',
    filterOperators: getGridDateOperators()
  },
  { 
    field: 'SKU', 
    headerName: 'SKU', 
    flex: 1.8,
    minWidth: 200,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'quantity_sold', 
    headerName: 'Quantity Sold', 
    flex: 0.8,
    minWidth: 120,
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => params.value.toLocaleString()
  },
  { 
    field: 'failed_quantity', 
    headerName: 'Failed Quantity', 
    flex: 0.8,
    minWidth: 120,
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
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

const COGSPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [cogs, setCogs] = useState<COGS[]>([]);
  const [failedCogs, setFailedCogs] = useState<FailedCOGS[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Latest COGS record state
  const [latestCOGS, setLatestCOGS] = useState<LatestCOGS | null>(null);
  
  // Status check state
  const [status, setStatus] = useState<COGSStatus | null>(null);
  
  // Date range filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cogsData, failedCogsData] = await Promise.all([
        cogsService.getAll(),
        cogsService.getAllFailed()
      ]);
      setCogs(cogsData);
      setFailedCogs(failedCogsData);
      
      // Load latest COGS record
      loadLatestCOGS();
      
      // Check status
      checkStatus();
    } catch (error) {
      showSnackbar('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const loadLatestCOGS = async () => {
    try {
      const data = await cogsService.getLatest();
      setLatestCOGS(data);
    } catch (error) {
      console.error('Error loading latest COGS record:', error);
      // Don't show a snackbar for this as it's not critical
    }
  };
  
  const checkStatus = async () => {
    try {
      const data = await cogsService.checkStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error checking COGS status:', error);
      // Don't show a snackbar for this as it's not critical
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const { cogs: cogsData, failedCogs: failedCogsData } = await cogsService.refresh();
      setCogs(cogsData);
      setFailedCogs(failedCogsData);
      
      // Reload latest COGS and check status
      await loadLatestCOGS();
      await checkStatus();
      
      showSnackbar('Results refreshed successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to refresh results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      await cogsService.deleteAll();
      setCogs([]);
      setFailedCogs([]);
      setLatestCOGS(null);
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
    // Download COGS results
    exportToCsv(
      cogsColumns, 
      filteredCogs, 
      'cogs_records'
    );
    
    // Add small delay before downloading failed COGS
    setTimeout(() => {
      exportToCsv(
        failedCogsColumns, 
        filteredFailedCogs, 
        'failed_cogs_records'
      );
    }, 100);
  };

  const filteredCogs = useMemo(() => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    return cogs.filter(record => {
      const searchLower = searchText.toLowerCase();
      
      // Text search filtering
      const matchesSearch = !searchText ||
        record.sales_record_id.toLowerCase().includes(searchLower) ||
        record.SKU.toLowerCase().includes(searchLower) ||
        record.fulfilled_by_PO.toLowerCase().includes(searchLower) ||
        record.sales_date === searchText;
      
      // Date range filtering using string comparison
      const salesDateStr = record.sales_date.split('T')[0]; // Get YYYY-MM-DD part
      const matchesDateRange = !startDateStr || !endDateStr || 
        (salesDateStr >= startDateStr && salesDateStr <= endDateStr);
      
      return matchesSearch && matchesDateRange;
    });
  }, [cogs, searchText, startDate, endDate]);

  const filteredFailedCogs = useMemo(() => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    return failedCogs.filter(record => {
      const searchLower = searchText.toLowerCase();
      
      // Text search filtering
      const matchesSearch = !searchText ||
        record.sales_record_id.toLowerCase().includes(searchLower) ||
        record.SKU.toLowerCase().includes(searchLower) ||
        record.sales_date === searchText;
      
      // Date range filtering using string comparison
      const salesDateStr = record.sales_date.split('T')[0]; // Get YYYY-MM-DD part
      const matchesDateRange = !startDateStr || !endDateStr || 
        (salesDateStr >= startDateStr && salesDateStr <= endDateStr);
      
      return matchesSearch && matchesDateRange;
    });
  }, [failedCogs, searchText, startDate, endDate]);

  // Get search placeholder based on active tab
  const getSearchPlaceholder = () => {
    return activeTab === 0 
      ? 'Quick search by Sales Record ID, SKU, PO ID, or Sales Date (YYYY-MM-DD)'
      : 'Quick search by Sales Record ID, SKU, or Sales Date (YYYY-MM-DD)';
  };

  return (
    <BasePage>
      {/* Cards Section */}
      <Box sx={{ height: '25%', maxHeight: '200px', mb: 2, mt: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Card 1: Latest COGS Record */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest COGS Record
              </CardTitle>
              <CardContent>
                {latestCOGS ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestCOGS.sales_record_id}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestCOGS.SKU} ${parseFloat(latestCOGS.cogs_value).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestCOGS.customer_name} {latestCOGS.sales_date}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No COGS records available</Typography>
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
                      {status.all_cogs_generated ? "No Action Needed" : "Take Action"}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      COGS Generated for All Sales Records: {status.all_cogs_generated ? (
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
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setConfirmDialogOpen(true)}
          disabled={loading}
        >
          Delete All
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={loading}
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
              minWidth: 20,
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
          <Tab label="COGS" sx={{ pl: 0, ml: 0 }} />
          <Tab label="Failed COGS" />
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

      {activeTab === 0 ? (
        <DataGrid
          rows={filteredCogs}
          columns={cogsColumns}
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
          disableRowSelectionOnClick
        />
      ) : (
        <DataGrid
          rows={filteredFailedCogs}
          columns={failedCogsColumns}
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
          disableRowSelectionOnClick
        />
      )}

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Delete All COGS</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete all COGS records and failed COGS records. This action cannot be undone.
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

export default COGSPage; 