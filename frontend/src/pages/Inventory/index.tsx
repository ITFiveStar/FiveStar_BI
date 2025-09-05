import React, { useEffect, useState, useMemo } from 'react';
import { 
  DataGrid, 
  GridColDef,
  getGridDateOperators
} from '@mui/x-data-grid';
import {
  Alert,
  Snackbar,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import BasePage from '../../components/common/BasePage';
import { inventoryService } from '../../services/inventoryService';
import { Inventory, InventoryRawMaterial } from '../../types/inventory';
import { dataGridStyles } from '../../components/common/DataGrid/styles';
import { exportToCsv } from '../../utils/exportToCsv';

const inventoryColumns: GridColDef[] = [
  { field: 'SKU', headerName: 'SKU', width: 300 },
  { 
    field: 'as_of_date', 
    headerName: 'As Of Date', 
    width: 150,
    type: 'date',
    valueGetter: (params) => new Date(params.value.split('T')[0]),
    valueFormatter: (params) => params.value?.toISOString().split('T')[0] || '',
    filterOperators: getGridDateOperators()
  },
  { 
    field: 'manufactured_total_quantity', 
    headerName: 'Total Manufactured', 
    width: 150,
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
  },
  { 
    field: 'in_stock_quantity', 
    headerName: 'In Stock', 
    width: 150,
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
  },
  {
    field: 'inventory_value',
    headerName: 'Inventory Value',
    width: 150,
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
  }
];

const rawMaterialColumns: GridColDef[] = [
  { field: 'Product', headerName: 'Product', width: 300 },
  { 
    field: 'as_of_date', 
    headerName: 'As Of Date', 
    width: 150,
    type: 'date',
    valueGetter: (params) => new Date(params.value.split('T')[0]),
    valueFormatter: (params) => params.value?.toISOString().split('T')[0] || '',
    filterOperators: getGridDateOperators()
  },
  { 
    field: 'purchased_total_quantity', 
    headerName: 'Total Purchased', 
    width: 150,
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
  },
  { 
    field: 'in_stock_quantity', 
    headerName: 'In Stock', 
    width: 150,
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
  },
  {
    field: 'inventory_value',
    headerName: 'Inventory Value',
    width: 150,
    valueFormatter: (params) => params.value?.toLocaleString('en-US')
  }
];

const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [rawMaterial, setRawMaterial] = useState<InventoryRawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getAll();
      setInventory(data.inventory);
      setRawMaterial(data.rawMaterial);
    } catch (error) {
      showSnackbar('Failed to load data', 'error');
    } finally {
      setLoading(false);
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
      const data = await inventoryService.refresh();
      setInventory(data.inventory);
      setRawMaterial(data.rawMaterial);
      showSnackbar('Inventory refreshed successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to refresh inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDate) return;

    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await inventoryService.generateAsOf(dateStr);
      setInventory(data.inventory);
      setRawMaterial(data.rawMaterial);
      setSearchText(dateStr);
      setGenerateDialogOpen(false);
      showSnackbar('Inventory generated successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to generate inventory', 'error');
    } finally {
      setLoading(false);
      setSelectedDate(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setLoading(true);
      await inventoryService.deleteAll();
      setInventory([]);
      setRawMaterial([]);
      setConfirmDialogOpen(false);
      showSnackbar('All inventory records deleted successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to delete inventory records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchText(newValue);
  };

  const handleDownload = () => {
    if (activeTab === 0) {
      exportToCsv(inventoryColumns, filteredInventory, 'manufactured_SKU_inventory');
    } else {
      exportToCsv(rawMaterialColumns, filteredRawMaterial, 'purchased_raw_material_inventory');
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(record => {
      const searchLower = searchText.toLowerCase();
      return (
        record.SKU.toLowerCase().includes(searchLower) ||
        record.as_of_date === searchText
      );
    });
  }, [inventory, searchText]);

  const filteredRawMaterial = useMemo(() => {
    return rawMaterial.filter(record => {
      const searchLower = searchText.toLowerCase();
      return (
        record.Product.toLowerCase().includes(searchLower) ||
        record.as_of_date === searchText
      );
    });
  }, [rawMaterial, searchText]);

  return (
    <BasePage>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
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
          startIcon={<CalendarTodayIcon />}
          onClick={() => setGenerateDialogOpen(true)}
          disabled={loading}
        >
          Generate
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
        >
          Download
        </Button>
      </Box>

      <Box sx={{ width: '100%', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Manufactured SKU Inventory" />
          <Tab label="Purchased Raw Material Inventory" />
        </Tabs>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          value={searchText}
          onChange={handleSearchChange}
          placeholder={activeTab === 0 
            ? "Quick search by SKU or As of Date (yyyy-mm-dd)"
            : "Quick search by Product or As of Date (yyyy-mm-dd)"
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 400 }}
        />
      </Box>

      {activeTab === 0 ? (
        <DataGrid
          rows={filteredInventory}
          columns={inventoryColumns}
          loading={loading}
          getRowId={(row) => `${row.SKU}-${row.as_of_date}`}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={dataGridStyles}
          disableRowSelectionOnClick
        />
      ) : (
        <DataGrid
          rows={filteredRawMaterial}
          columns={rawMaterialColumns}
          loading={loading}
          getRowId={(row) => `${row.Product}-${row.as_of_date}`}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={dataGridStyles}
          disableRowSelectionOnClick
        />
      )}

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Delete All Inventory</DialogTitle>
        <DialogContent>
          Are you sure you want to delete all inventory records (both manufactured SKU and purchased raw materials)? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteAll} color="error" variant="contained">
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Inventory</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Enter the date for inventory generation"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              format="yyyy-MM-dd"
              sx={{ mt: 2, width: '100%' }}
              slotProps={{ 
                textField: { 
                  fullWidth: true,
                  placeholder: 'yyyy-mm-dd'
                } 
              }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleGenerate} 
            variant="contained" 
            disabled={!selectedDate}
          >
            Generate
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

export default InventoryPage; 