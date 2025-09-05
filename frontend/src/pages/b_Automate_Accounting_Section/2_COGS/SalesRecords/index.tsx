import React, { useEffect, useState, useMemo } from 'react';
import { DataGrid, GridColDef, getGridDateOperators } from '@mui/x-data-grid';
import { 
  Alert, 
  Snackbar, 
  Box, 
  Button, 
  TextField, 
  InputAdornment, 
  Grid, 
  Typography, 
  styled, 
  Select, 
  MenuItem, 
  IconButton,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isAfter, isBefore } from 'date-fns';
import BasePage from '../../../../components/common/BasePage';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BusinessIcon from '@mui/icons-material/Business';
import CloseIcon from '@mui/icons-material/Close';
import SalesRecordDialog from './SalesRecordDialog';
import { salesRecordService } from '../../../../services/salesRecordService';
import { customerService } from '../../../../services/customerService';
import { SalesRecord } from '../../../../types/salesRecord';
import { Customer } from '../../../../types/customer';
import ConfirmDialog from '../../../../components/common/ConfirmDialog';
import { dataGridStyles } from '../../../../components/common/DataGrid/styles';
import { exportToCsv } from '../../../../utils/exportToCsv';
import BulkUploadDialog from './BulkUploadDialog';

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

// Interface for latest sales record
interface LatestSalesRecord {
  sales_record_id: string;
  sku: string;
  sales_date: string;
  customer_name: string;
}

const columns: GridColDef[] = [
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
    minWidth: 110,
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
    field: 'sku', 
    headerName: 'SKU', 
    flex: 1.5,
    minWidth: 200,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'quantity_sold', 
    headerName: 'Quantity', 
    flex: 0.7,
    minWidth: 100,
    type: 'number',
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => {
      return params.value?.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }
  },
  { 
    field: 'customer_name', 
    headerName: 'Customer', 
    flex: 1,
    minWidth: 150,
    headerAlign: 'left',
    align: 'left',
  },
];

const SalesRecords: React.FC = () => {
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState<SalesRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Latest Sales Record state
  const [latestSales, setLatestSales] = useState<LatestSalesRecord | null>(null);
  
  // Date range filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Customer management state
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerDeleteConfirmOpen, setCustomerDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const loadSalesRecords = async () => {
    try {
      setLoading(true);
      const data = await salesRecordService.getAll();
      setSalesRecords(data);
    } catch (error) {
      showSnackbar('Failed to load sales records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (error) {
      showSnackbar('Failed to load customers', 'error');
    }
  };
  
  const loadLatestSales = async () => {
    try {
      const data = await salesRecordService.getLatest();
      setLatestSales(data);
    } catch (error) {
      console.error('Error loading latest sales record:', error);
      // Don't show a snackbar for this as it's not critical
    }
  };

  useEffect(() => {
    loadSalesRecords();
    loadCustomers();
    loadLatestSales();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAdd = () => {
    setSelected([]);
    setDialogOpen(true);
  };

  const handleEdit = () => {
    if (selected.length > 0) {
      setDialogOpen(true);
    }
  };

  const handleDelete = () => {
    if (selected.length > 0) {
      setConfirmDialogOpen(true);
    }
  };
  
  const handleCustomerChange = (event: SelectChangeEvent<string>) => {
    setSelectedCustomer(event.target.value);
  };
  
  const handleCustomerDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setCustomerDeleteConfirmOpen(true);
  };
  
  const confirmDeleteCustomer = async () => {
    try {
      if (customerToDelete) {
        await customerService.delete([customerToDelete]);
        showSnackbar(`Customer ${customerToDelete.name} deleted successfully`, 'success');
        loadCustomers();
        setCustomerDeleteConfirmOpen(false);
        setCustomerToDelete(null);
      }
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Delete operation failed', 'error');
    }
  };
  
  const handleAddCustomer = async () => {
    try {
      if (newCustomerName.trim()) {
        await customerService.create({ name: newCustomerName.trim() });
        showSnackbar('Customer created successfully', 'success');
        loadCustomers();
        setNewCustomerName('');
        setCustomerDialogOpen(false);
      }
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Create operation failed', 'error');
    }
  };

  const handleDialogSubmit = async (data: any) => {
    try {
      if (selected.length > 0) {
        await salesRecordService.update(data.selected_records, data.update_data);
        showSnackbar('Sales record(s) updated successfully', 'success');
      } else {
        await salesRecordService.create(data);
        showSnackbar('Sales record created successfully', 'success');
      }
      setDialogOpen(false);
      loadSalesRecords();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      let result;
      
      console.log(`Attempting to delete ${selected.length} sales records`);
      
      // For very large deletions (select all scenario), use delete_all endpoint
      if (selected.length > 100) {
        result = await salesRecordService.deleteAll();
        showSnackbar(`Successfully deleted all sales records (${result.num_deleted} records)`, 'success');
      } else if (selected.length > 10) {
        // Use bulk delete for better performance when deleting many records
        result = await salesRecordService.bulkDelete(selected);
        showSnackbar(`Successfully deleted ${result.deleted_count} sales records`, 'success');
      } else {
        // Use the original method for smaller deletions to get detailed error reporting
        result = await salesRecordService.delete(selected);
        
        if (result.failed_deletes.length > 0) {
          const errorMessages = result.failed_deletes
            .map(f => `${f.sales_record_id}: ${f.error}`)
            .join('\n');
          
          showSnackbar(
            `Failed to delete some sales records:\n${errorMessages}`,
            'error'
          );
        }

        if (result.success_deletes.length > 0) {
          showSnackbar('Selected sales records deleted successfully', 'success');
        }
      }

      setConfirmDialogOpen(false);
      setSelected([]);
      loadSalesRecords();
    } catch (error: any) {
      console.error('Delete operation error:', error);
      showSnackbar(error.response?.data?.error || 'Delete operation failed', 'error');
    }
  };

  const handleBulkUpload = async (data: any[]) => {
    // This function is now just used to trigger a refresh after bulk upload
    // The actual bulk upload is handled directly in BulkUploadDialog
    try {
      loadSalesRecords();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to refresh data', 'error');
    }
  };

  const filteredSalesRecords = useMemo(() => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    return salesRecords.filter(record => {
      // Text search filtering
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText ||
        record.sales_record_id.toLowerCase().includes(searchLower) ||
        record.sku.toLowerCase().includes(searchLower) ||
        (record.customer_name && record.customer_name.toLowerCase().includes(searchLower)) ||
        record.sales_date === searchText;  // Exact match for date
      
      // Customer filtering
      const matchesCustomer = !selectedCustomer || 
        (record.customer_name && record.customer_name.toLowerCase() === selectedCustomer.toLowerCase());
      
      // Date range filtering using string comparison
      const recordDateStr = record.sales_date.split('T')[0]; // Get YYYY-MM-DD part
      const matchesDateRange = !startDateStr || !endDateStr || 
        (recordDateStr >= startDateStr && recordDateStr <= endDateStr);
      
      return matchesSearch && matchesCustomer && matchesDateRange;
    });
  }, [salesRecords, searchText, selectedCustomer, startDate, endDate]);

  return (
    <BasePage>
      {/* Cards Section */}
      <Box sx={{ height: '25%', maxHeight: '200px', mb: 2, mt: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Card 1: Latest Sales Record */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest Sales Record
              </CardTitle>
              <CardContent>
                {latestSales ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestSales.sales_record_id}
                    </Typography>
                    {/* <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestSales.SKU}
                    </Typography> */}
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestSales.customer_name || 'No Customer'}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestSales.sales_date}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No Sales records available</Typography>
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
          
          {/* Card 3: Customers */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <BusinessIcon fontSize="small" />
                Customers
              </CardTitle>
              <CardContent>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel id="customer-select-label">Select Customer</InputLabel>
                  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', height: '40px' }}>
                    <Select
                      labelId="customer-select-label"
                      value={selectedCustomer}
                      label="Select Customer"
                      onChange={handleCustomerChange}
                      sx={{
                        '& .MuiSelect-select::placeholder': {
                          color: '#9e9e9e',
                          opacity: 1
                        },
                        width: '100%',
                        height: '40px'
                      }}
                    >
                      <MenuItem value="">
                        <em>All Customers</em>
                      </MenuItem>
                      {customers.map((customer) => (
                        <MenuItem key={customer.customer_id} value={customer.name}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span>{customer.name}</span>
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomerDelete(customer);
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {selectedCustomer && (
                      <IconButton
                        size="small"
                        onClick={() => setSelectedCustomer('')}
                        sx={{ 
                          position: 'absolute', 
                          right: '32px', // Position before the dropdown arrow
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  size="small"
                  fullWidth
                  onClick={() => setCustomerDialogOpen(true)}
                >
                  Add New Customer
                </Button>
              </CardContent>
            </CardContainer>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add
        </Button>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setBulkUploadOpen(true)}
        >
          Bulk Upload
        </Button>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={handleEdit}
          disabled={!selected.length}
        >
          Edit
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setConfirmDialogOpen(true)}
          disabled={!selected.length}
        >
          Delete
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => exportToCsv(columns, filteredSalesRecords, 'sales_records')}
        >
          Download
        </Button>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Quick search by Sales Record ID, SKU, Customer, or Sales Date (YYYY-MM-DD)"
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
      <DataGrid
        rows={filteredSalesRecords}
        columns={columns}
        loading={loading}
        getRowId={(row) => `${row.sales_record_id}_${row.sku}`}
        checkboxSelection
        disableRowSelectionOnClick
        autoHeight
        onRowSelectionModelChange={(newSelectionModel) => {
          setSelected(salesRecords.filter(record => 
            newSelectionModel.includes(`${record.sales_record_id}_${record.sku}`)
          ));
        }}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
          columns: {
            columnVisibilityModel: {}
          },
        }}
        sx={dataGridStyles}
      />
      <SalesRecordDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        salesRecords={selected.length > 0 ? selected : undefined}
        customers={customers}
        title={selected.length > 0 ? `Edit Sales Record${selected.length > 1 ? 's' : ''}` : 'Add Sales Record'}
      />
      
      {/* Add Customer Dialog */}
      <Dialog
        open={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
      >
        <DialogTitle>Create New Customer</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Customer Name"
            type="text"
            fullWidth
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCustomer} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Customer Confirmation Dialog */}
      <ConfirmDialog
        open={customerDeleteConfirmOpen}
        onClose={() => setCustomerDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteCustomer}
        title="Delete Customer"
        content={`Are you sure you want to delete customer "${customerToDelete?.name}"?`}
      />
      
      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUpload={handleBulkUpload}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Sales Records"
        content={`Are you sure you want to delete ${selected.length} sales record(s)?`}
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

export default SalesRecords; 