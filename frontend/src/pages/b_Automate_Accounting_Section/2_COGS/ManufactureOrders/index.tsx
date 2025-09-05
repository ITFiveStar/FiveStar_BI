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
  Tooltip,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isAfter, isBefore } from 'date-fns';
import BasePage from '../../../../components/common/BasePage';
import ManufactureOrderDialog from './ManufactureOrderDialog';
import { manufactureOrderService } from '../../../../services/manufactureOrderService';
import { ManufactureOrder } from '../../../../types/manufactureOrder';
import ConfirmDialog from '../../../../components/common/ConfirmDialog';
import { dataGridStyles } from '../../../../components/common/DataGrid/styles';
import { exportToCsv } from '../../../../utils/exportToCsv';
import BulkUploadDialog from './BulkUploadDialog';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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

const StatusItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1),
  '& svg': {
    marginRight: theme.spacing(1),
  }
}));

// Interface for latest MO record
interface LatestMO {
  sku: string;
  manufacture_date: string;
  manufacture_quantity: string;
}

// Interface for status check
interface ManufactureOrderStatus {
  all_products_planned: boolean;
  missing_products: string[];
}

const columns: GridColDef[] = [
  { 
    field: 'manufacture_order_id', 
    headerName: 'MO ID', 
    flex: 0.8,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
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
    field: 'product', 
    headerName: 'Product', 
    flex: 1.2,
    minWidth: 150,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'manufacture_quantity', 
    headerName: 'Quantity', 
    flex: 0.8,
    minWidth: 100,
    type: 'number',
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => params.value?.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  },
  { 
    field: 'manufacture_date', 
    headerName: 'Manufacture Date', 
    flex: 1,
    minWidth: 130,
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
  }
];

const ManufactureOrders: React.FC = () => {
  const [manufactureOrders, setManufactureOrders] = useState<ManufactureOrder[]>([]);
  const [products, setProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState<ManufactureOrder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Latest MO Record state
  const [latestMO, setLatestMO] = useState<LatestMO | null>(null);
  
  // Status check state
  const [status, setStatus] = useState<ManufactureOrderStatus | null>(null);
  
  // Date range filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // State for selected missing product dropdown
  const [selectedMissingProduct, setSelectedMissingProduct] = useState<string>('');

  const loadManufactureOrders = async () => {
    try {
      setLoading(true);
      const data = await manufactureOrderService.getAll();
      setManufactureOrders(data);
    } catch (error) {
      showSnackbar('Failed to load manufacture orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await manufactureOrderService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };
  
  const loadLatestMO = async () => {
    try {
      const data = await manufactureOrderService.getLatest();
      setLatestMO(data);
    } catch (error: any) {
      console.error('Error loading latest MO:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // If it's a 404 (no data), set latestMO to null to show "No MO records available"
      if (error.response?.status === 404) {
        console.log('No manufacture orders found, setting latestMO to null');
        setLatestMO(null);
      }
      // Don't show a snackbar for this as it's not critical
    }
  };
  
  const checkStatus = async () => {
    try {
      const data = await manufactureOrderService.checkStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error checking manufacture order status:', error);
      // Don't show a snackbar for this as it's not critical
    }
  };

  useEffect(() => {
    loadManufactureOrders();
    loadProducts();
    loadLatestMO();
    checkStatus();
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

  const handleDialogSubmit = async (data: any) => {
    try {
      if (selected.length > 0) {
        await manufactureOrderService.update(selected, data.update_data);
        showSnackbar('Manufacture order(s) updated successfully', 'success');
      } else {
        await manufactureOrderService.create(data);
        showSnackbar('Manufacture order created successfully', 'success');
      }
      setDialogOpen(false);
      loadManufactureOrders();
      checkStatus(); // Re-check status after making changes
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      let result;
      
      console.log(`Attempting to delete ${selected.length} manufacture orders`);
      
      // For very large deletions (select all scenario), use delete_all endpoint
      if (selected.length > 100) {
        result = await manufactureOrderService.deleteAll();
        showSnackbar(`Successfully deleted all manufacture orders (${result.num_deleted} records)`, 'success');
      } else if (selected.length > 10) {
        // Use bulk delete for better performance when deleting many records
        result = await manufactureOrderService.bulkDelete(selected);
        showSnackbar(`Successfully deleted ${result.deleted_count} manufacture orders`, 'success');
      } else {
        // Use the original method for smaller deletions to get detailed error reporting
        result = await manufactureOrderService.delete(selected);
        
        if (result.failed_deletes.length > 0) {
          const errorMessages = result.failed_deletes
            .map(f => `${(f as any).sku || f.SKU}: ${f.error}`)
            .join('\n');
          
          showSnackbar(
            `Failed to delete some manufacture orders:\n${errorMessages}`,
            'error'
          );
        }

        if (result.success_deletes.length > 0) {
          showSnackbar('Selected manufacture orders deleted successfully', 'success');
        }
      }

      setConfirmDialogOpen(false);
      setSelected([]);
      loadManufactureOrders();
      checkStatus(); // Re-check status after making changes
    } catch (error: any) {
      console.error('Delete operation error:', error);
      showSnackbar(
        error.response?.data?.error || 'Delete operation failed',
        'error'
      );
    }
  };

  const handleConfirmDeleteAll = async () => {
    try {
      const result = await manufactureOrderService.deleteAll();
      showSnackbar(`Successfully deleted all manufacture orders (${result.num_deleted} records)`, 'success');
      setDeleteAllDialogOpen(false);
      setSelected([]);
      loadManufactureOrders();
      checkStatus(); // Re-check status after making changes
    } catch (error: any) {
      console.error('Delete all operation error:', error);
      showSnackbar(error.response?.data?.error || 'Delete all operation failed', 'error');
    }
  };

  const handleBulkUpload = async (data: any[]) => {
    // This function is now just used to trigger a refresh after bulk upload
    // The actual bulk upload is handled directly in BulkUploadDialog
    try {
      loadManufactureOrders();
      checkStatus(); // Re-check status after making changes
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to refresh data', 'error');
    }
  };
  
  const handleMissingProductChange = (event: SelectChangeEvent<string>) => {
    setSelectedMissingProduct(event.target.value);
  };

  const handleCopyAll = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent dropdown from closing
    
    if (status && status.missing_products.length > 0) {
      const textToCopy = status.missing_products.join(', ');
      navigator.clipboard.writeText(textToCopy)
        .catch(err => {
          console.error('Failed to copy text: ', err);
        });
    }
  };
  
  const handleCopyProduct = (event: React.MouseEvent<HTMLButtonElement>, product: string) => {
    event.stopPropagation(); // Prevent dropdown from closing
    
    navigator.clipboard.writeText(product)
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  const filteredManufactureOrders = useMemo(() => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    return manufactureOrders.filter(record => {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = !searchText ||
        record.manufacture_order_id.toString().includes(searchLower) ||
        record.sku.toLowerCase().includes(searchLower) ||
        record.product.toLowerCase().includes(searchLower) ||
        record.manufacture_date?.includes(searchText);

      // Date range filtering using string comparison
      const recordDateStr = record.manufacture_date?.split('T')[0] || ''; // Get YYYY-MM-DD part
      const matchesDateRange = !startDateStr || !endDateStr || 
        (recordDateStr >= startDateStr && recordDateStr <= endDateStr);
      
      return matchesSearch && matchesDateRange;
    });
  }, [manufactureOrders, searchText, startDate, endDate]);

  return (
    <BasePage>
      {/* New Card Grid - constrained to 1/4 of the height */}
      <Box sx={{ height: '25%', maxHeight: '200px', mb: 2, mt: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Card 1: Latest MO Record */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest MO Record
              </CardTitle>
              <CardContent>
                {latestMO ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestMO.sku} 
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {parseInt(latestMO.manufacture_quantity).toLocaleString()} units
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {format(new Date(latestMO.manufacture_date), 'yyyy-MM-dd')}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No MO records available</Typography>
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
            <Tooltip title="This action guider indicates if the distinct products procured in purchase orders records have at least appear once in the planned manufacture orders. It does NOT indicate if the procured quantities have been fully consumed in the planned manufacture orders." placement="top">
              <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
                <CardTitle variant="subtitle1">
                  <AssignmentTurnedInIcon fontSize="small" />
                  Action Guider
                </CardTitle>
                <CardContent>
                  {status ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black">
                          All Procured Products Planned in Manufacture:
                          <span style={{ color: status.all_products_planned ? 'green' : 'red', marginLeft: '8px' }}>
                            {status.all_products_planned ? "Yes" : "No"}
                          </span>
                        </Typography>
                      </Box>
                      
                      {!status.all_products_planned && status.missing_products.length > 0 && (
                        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                          <InputLabel id="missing-product-select-label">Missing Products List</InputLabel>
                          <Select
                            labelId="missing-product-select-label"
                            value={selectedMissingProduct}
                            label="All Missing Products"
                            onChange={handleMissingProductChange}
                            sx={{
                              '& .MuiSelect-select::placeholder': {
                                color: '#9e9e9e',
                                opacity: 1
                              },
                              width: '100%',
                              height: '40px'
                            }}
                            MenuProps={{
                              PaperProps: {
                                style: {
                                  maxHeight: 300,
                                  width: 'auto'
                                }
                              }
                            }}
                          >
                            <MenuItem value="" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <em>All Missing Products</em>
                              <IconButton
                                size="small"
                                onClick={handleCopyAll}
                                title="Copy all missing products"
                                sx={{ ml: 1 }}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </MenuItem>
                            {status.missing_products.map((product, index) => (
                              <MenuItem key={index} value={product} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span>{product}</span>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleCopyProduct(e, product)}
                                  title={`Copy "${product}"`}
                                  sx={{ ml: 1 }}
                                >
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2">Loading status information...</Typography>
                  )}
                </CardContent>
              </CardContainer>
            </Tooltip>
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
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteAllDialogOpen(true)}
        >
          Delete All
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => exportToCsv(columns, filteredManufactureOrders, 'manufacture_orders')}
        >
          Download
        </Button>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Quick search by SKU, Product, or Manufacture Date (YYYY-MM-DD)"
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
        rows={filteredManufactureOrders}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        checkboxSelection
        disableRowSelectionOnClick
        autoHeight
        onRowSelectionModelChange={(newSelectionModel) => {
          setSelected(manufactureOrders.filter(mo => 
            newSelectionModel.includes(mo.id)
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

      <ManufactureOrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        manufactureOrders={selected.length > 0 ? selected : undefined}
        products={products}
        title={selected.length > 0 ? `Edit Manufacture Order${selected.length > 1 ? 's' : ''}` : 'Add Manufacture Order'}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Manufacture Orders"
        content={`Are you sure you want to delete ${selected.length} manufacture order(s)?`}
      />
      <ConfirmDialog
        open={deleteAllDialogOpen}
        onClose={() => setDeleteAllDialogOpen(false)}
        onConfirm={handleConfirmDeleteAll}
        title="Delete All Manufacture Orders"
        content="Are you sure you want to delete ALL manufacture orders? This action cannot be undone."
      />
      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUpload={handleBulkUpload}
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

export default ManufactureOrders; 