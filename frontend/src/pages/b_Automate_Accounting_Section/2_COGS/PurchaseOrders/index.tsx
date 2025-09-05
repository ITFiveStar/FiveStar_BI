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
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parse, isAfter, isBefore } from 'date-fns';
import BasePage from '../../../../components/common/BasePage';
import ToolbarActions from '../../../../components/common/DataGrid/ToolbarActions';
import PurchaseOrderDialog from './PurchaseOrderDialog';
import { purchaseOrderService } from '../../../../services/purchaseOrderService';
import { supplierService } from '../../../../services/supplierService';
import { PurchaseOrder } from '../../../../types/purchaseOrder';
import { Supplier } from '../../../../types/supplier';
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
import BusinessIcon from '@mui/icons-material/Business';
import CloseIcon from '@mui/icons-material/Close';

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

// Interface for latest PO record
interface LatestPO {
  purchase_order_id: string;
  order_date: string;
  supplier_name: string;
  total_cost: string;
}

const columns: GridColDef[] = [
  { 
    field: 'purchase_order_id', 
    headerName: 'PO ID', 
    flex: 1,
    minWidth: 150,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'supplier_name', 
    headerName: 'Supplier', 
    flex: 1,
    minWidth: 120,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'order_date', 
    headerName: 'Purchase Date', 
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
    field: 'product', 
    headerName: 'Product', 
    flex: 1.5,
    minWidth: 150,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'purchase_quantity', 
    headerName: 'Quantity', 
    flex: 0.7,
    minWidth: 90, 
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
    field: 'purchase_unit_price', 
    headerName: 'Unit Price', 
    flex: 0.8,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => {
      return params.value ? Number(params.value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : '';
    }
  },
  { 
    field: 'total_cost', 
    headerName: 'Total Cost', 
    flex: 0.8,
    minWidth: 100,
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => {
      return params.value ? Number(params.value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) : '';
    }
  },
  { 
    field: 'purchase_currency', 
    headerName: 'Currency', 
    flex: 0.6,
    minWidth: 80,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'target_currency', 
    headerName: 'Target', 
    flex: 0.6,
    minWidth: 80,
    headerAlign: 'left',
    align: 'left',
  },
  { 
    field: 'fx_rate', 
    headerName: 'FX Rate', 
    flex: 0.7,
    minWidth: 90,
    headerAlign: 'left',
    align: 'left',
    valueFormatter: (params) => {
      return params.value ? Number(params.value).toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      }) : '';
    }
  },
  { 
    field: 'quantity_left', 
    headerName: 'Remaining', 
    flex: 0.7,
    minWidth: 90, 
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
];

const PurchaseOrders: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selected, setSelected] = useState<PurchaseOrder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  
  // Latest PO Record state
  const [latestPO, setLatestPO] = useState<LatestPO | null>(null);
  
  // Date range filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // Supplier management state
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierDeleteConfirmOpen, setSupplierDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrderService.getAll();
      setPurchaseOrders(data);
    } catch (error) {
      showSnackbar('Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getAll();
      setSuppliers(data);
    } catch (error) {
      showSnackbar('Failed to load suppliers', 'error');
    }
  };
  
  const loadLatestPO = async () => {
    try {
      const data = await purchaseOrderService.getLatest();
      setLatestPO(data);
    } catch (error) {
      console.error('Error loading latest PO:', error);
      // Don't show a snackbar for this as it's not critical
    }
  };

  useEffect(() => {
    loadPurchaseOrders();
    loadSuppliers();
    loadLatestPO();
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
  
  const handleSupplierChange = (event: SelectChangeEvent<string>) => {
    setSelectedSupplier(event.target.value);
  };
  
  const handleSupplierDelete = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setSupplierDeleteConfirmOpen(true);
  };
  
  const confirmDeleteSupplier = async () => {
    try {
      if (supplierToDelete) {
        await supplierService.delete([supplierToDelete]);
        showSnackbar(`Supplier ${supplierToDelete.name} deleted successfully`, 'success');
        loadSuppliers();
        setSupplierDeleteConfirmOpen(false);
        setSupplierToDelete(null);
      }
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Delete operation failed', 'error');
    }
  };
  
  const handleAddSupplier = async () => {
    try {
      if (newSupplierName.trim()) {
        await supplierService.create({ name: newSupplierName.trim() });
        showSnackbar('Supplier created successfully', 'success');
        loadSuppliers();
        setNewSupplierName('');
        setSupplierDialogOpen(false);
      }
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Create operation failed', 'error');
    }
  };

  const handleDialogSubmit = async (data: any) => {
    try {
      if (selected.length > 0) {
        await purchaseOrderService.update(data.selected_records, data.update_data);
        showSnackbar('Purchase order(s) updated successfully', 'success');
      } else {
        await purchaseOrderService.create(data);
        showSnackbar('Purchase order created successfully', 'success');
      }
      setDialogOpen(false);
      loadPurchaseOrders();
    } catch (error: any) {
      console.error('Error details:', error.response?.data);
      showSnackbar(error.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      let result;
      
      console.log(`Attempting to delete ${selected.length} purchase orders`);
      
      // For very large deletions (select all scenario), use delete_all endpoint
      if (selected.length > 100) {
        result = await purchaseOrderService.deleteAll();
        showSnackbar(`Successfully deleted all purchase orders (${result.num_deleted} records)`, 'success');
      } else if (selected.length > 10) {
        // Use bulk delete for better performance when deleting many records
        result = await purchaseOrderService.bulkDelete(selected);
        showSnackbar(`Successfully deleted ${result.deleted_count} purchase orders`, 'success');
      } else {
        // Use the original method for smaller deletions to get detailed error reporting
        result = await purchaseOrderService.delete(selected);
        
        if (result.failed_deletes.length > 0) {
          const errorMessages = result.failed_deletes
            .map(f => `${f.purchase_order_id}: ${f.error}`)
            .join('\n');
          
          showSnackbar(
            `Failed to delete some purchase orders:\n${errorMessages}`,
            'error'
          );
        }

        if (result.success_deletes.length > 0) {
          showSnackbar('Selected purchase orders deleted successfully', 'success');
        }
      }

      setConfirmDialogOpen(false);
      setSelected([]);
      loadPurchaseOrders();
    } catch (error: any) {
      console.error('Delete operation error:', error);
      showSnackbar(error.response?.data?.error || 'Delete operation failed', 'error');
    }
  };

  const handleConfirmDeleteAll = async () => {
    try {
      const result = await purchaseOrderService.deleteAll();
      showSnackbar(`Successfully deleted all purchase orders (${result.num_deleted} records)`, 'success');
      setDeleteAllDialogOpen(false);
      setSelected([]);
      loadPurchaseOrders();
    } catch (error: any) {
      console.error('Delete all operation error:', error);
      showSnackbar(error.response?.data?.error || 'Delete all operation failed', 'error');
    }
  };

  const handleBulkUpload = async (data: any[]) => {
    // This function is now just used to trigger a refresh after bulk upload
    // The actual bulk upload is handled directly in BulkUploadDialog
    try {
      loadPurchaseOrders();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to refresh data', 'error');
    }
  };
  
  // Format date for display
  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const filteredPurchaseOrders = useMemo(() => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    return purchaseOrders.filter(order => {
      const searchLower = searchText.toLowerCase();
      
      // Handle supplier filtering from dropdown
      const matchesSupplier = !selectedSupplier || 
        order.supplier_name.toLowerCase() === selectedSupplier.toLowerCase();
      
      // Handle text search filtering
      const matchesSearch = !searchText ||
        order.purchase_order_id.toLowerCase().includes(searchLower) ||
        order.product.toLowerCase().includes(searchLower) ||
        order.supplier_name.toLowerCase().includes(searchLower) ||
        order.order_date === searchText;  // Exact match for date
      
      // Apply date range filter using string comparison
      const orderDateStr = order.order_date.split('T')[0]; // Get YYYY-MM-DD part
      const matchesDateRange = !startDateStr || !endDateStr || 
        (orderDateStr >= startDateStr && orderDateStr <= endDateStr);
      
      return matchesSupplier && matchesSearch && matchesDateRange;
    });
  }, [purchaseOrders, searchText, selectedSupplier, startDate, endDate]);

  return (
    <BasePage>
      {/* New Card Grid - constrained to 1/4 of the height */}
      <Box sx={{ height: '25%', maxHeight: '200px', mb: 2, mt: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Card 1: Latest PO Record */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest PO Record
              </CardTitle>
              <CardContent>
                {latestPO ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestPO.purchase_order_id}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestPO.supplier_name} ${parseFloat(latestPO.total_cost).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {format(new Date(latestPO.order_date), 'yyyy-MM-dd')}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No PO records available</Typography>
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
          
          {/* Card 3: Suppliers */}
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <BusinessIcon fontSize="small" />
                Suppliers
              </CardTitle>
              <CardContent>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel id="supplier-select-label">Select Supplier</InputLabel>
                  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', height: '40px' }}>
                    <Select
                      labelId="supplier-select-label"
                      value={selectedSupplier}
                      label="Select Supplier"
                      onChange={(event: SelectChangeEvent<string>) => {
                        setSelectedSupplier(event.target.value);
                      }}
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
                        <em>All Suppliers</em>
                      </MenuItem>
                      {suppliers.map((supplier) => (
                        <MenuItem key={supplier.supplier_id} value={supplier.name}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span>{supplier.name}</span>
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSupplierDelete(supplier);
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {selectedSupplier && (
                      <IconButton
                        size="small"
                        onClick={() => setSelectedSupplier('')}
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
                  onClick={() => setSupplierDialogOpen(true)}
                >
                  Add New Supplier
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
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteAllDialogOpen(true)}
        >
          Delete All
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={() => exportToCsv(columns, filteredPurchaseOrders, 'purchase_orders')}
        >
          Download
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Quick search by PO ID, Supplier, Product, or Purchase Date (YYYY-MM-DD)"
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
        rows={filteredPurchaseOrders}
        columns={columns}
        loading={loading}
        getRowId={(row) => `${row.purchase_order_id}_${row.product}`}
        checkboxSelection
        disableRowSelectionOnClick
        autoHeight
        onRowSelectionModelChange={(newSelectionModel) => {
          setSelected(purchaseOrders.filter(po => 
            newSelectionModel.includes(`${po.purchase_order_id}_${po.product}`)
          ));
        }}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
          columns: {
            columnVisibilityModel: {}
          },
        }}
        // pageSizeOptions={[10, 25, 50, 100]}
        sx={dataGridStyles}
      />

      
      {/* Add Supplier Dialog */}
      <Dialog
        open={supplierDialogOpen}
        onClose={() => setSupplierDialogOpen(false)}
      >
        <DialogTitle>Create New Supplier</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Supplier Name"
            type="text"
            fullWidth
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupplierDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSupplier} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Supplier Confirmation Dialog */}
      <ConfirmDialog
        open={supplierDeleteConfirmOpen}
        onClose={() => setSupplierDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteSupplier}
        title="Delete Supplier"
        content={`Are you sure you want to delete supplier "${supplierToDelete?.name}"?`}
      />
      
      <PurchaseOrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        purchaseOrders={selected.length > 0 ? selected : undefined}
        suppliers={suppliers}
        title={selected.length > 0 ? `Edit Purchase Order${selected.length > 1 ? 's' : ''}` : 'Add Purchase Order'}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Purchase Orders"
        content={`Are you sure you want to delete ${selected.length} purchase order(s)?`}
      />
      <ConfirmDialog
        open={deleteAllDialogOpen}
        onClose={() => setDeleteAllDialogOpen(false)}
        onConfirm={handleConfirmDeleteAll}
        title="Delete All Purchase Orders"
        content="Are you sure you want to delete ALL purchase orders? This action cannot be undone."
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

export default PurchaseOrders; 