import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Tabs, Tab, Button, TextField, InputAdornment, Grid, Paper, styled, Tooltip } from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  CalendarMonth as CalendarMonthIcon,
  ShoppingCart as ShoppingCartIcon,
  BusinessCenter as BusinessCenterIcon,
  LocalShipping as LocalShippingIcon,
  Campaign as CampaignIcon,
  CreditCard as CreditCardIcon
} from '@mui/icons-material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { dataGridStyles } from '../../../../components/common/DataGrid/styles';
import BulkUploadDialog from './BulkUploadDialog';
import ConfirmDialog from '../../../../components/common/ConfirmDialog';
import amazonBIService from '../../../../services/amazonBIService';
import { AmazonOrder, SKUEconomics, AmazonInboundShipping, AmazonStatement, FBMShippingCost, AdsSpendByDay, AdsCreditCardPayment, QBAccountIDMapping } from '../../../../types/amazonBI';
import { LatestAmazonOrder, LatestSKUEconomics, LatestInboundShipping, LatestStatement, LatestFBMShippingCost, LatestAdsSpendByDay, LatestAdsCreditCardPayment } from '../../../../services/amazonBIService';
import BasePage from '../../../../components/common/BasePage';
import { useSnackbar } from 'notistack';
import { ALLOWED_SALES_CHANNELS } from './config/amazon.config';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isAfter, isBefore } from 'date-fns';

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

const AmazonBIInput: React.FC = () => {
  // State for table data
  const [salesData, setSalesData] = useState<AmazonOrder[]>([]);
  const [skuEconomicsData, setSkuEconomicsData] = useState<SKUEconomics[]>([]);
  const [inboundShippingData, setInboundShippingData] = useState<AmazonInboundShipping[]>([]);
  const [statementsData, setStatementsData] = useState<AmazonStatement[]>([]);
  const [fbmShippingData, setFbmShippingData] = useState<FBMShippingCost[]>([]);
  const [adsSpendData, setAdsSpendData] = useState<AdsSpendByDay[]>([]);
  const [adsCreditCardPaymentData, setAdsCreditCardPaymentData] = useState<AdsCreditCardPayment[]>([]);
  const [qbAccountMappingData, setQbAccountMappingData] = useState<QBAccountIDMapping[]>([]);
  
  // State for latest record data
  const [latestOrder, setLatestOrder] = useState<LatestAmazonOrder | null>(null);
  const [latestSKUEconomics, setLatestSKUEconomics] = useState<LatestSKUEconomics | null>(null);
  const [latestInboundShipping, setLatestInboundShipping] = useState<LatestInboundShipping | null>(null);
  const [latestStatement, setLatestStatement] = useState<LatestStatement | null>(null);
  const [latestFBMShipping, setLatestFBMShipping] = useState<LatestFBMShippingCost | null>(null);
  const [latestAdsSpend, setLatestAdsSpend] = useState<LatestAdsSpendByDay | null>(null);
  const [latestAdsCreditCardPayment, setLatestAdsCreditCardPayment] = useState<LatestAdsCreditCardPayment | null>(null);
  
  // State for selected rows in each table
  const [selectedSalesRows, setSelectedSalesRows] = useState<GridRowSelectionModel>([]);
  const [selectedSkuEconomicsRows, setSelectedSkuEconomicsRows] = useState<GridRowSelectionModel>([]);
  const [selectedInboundShippingRows, setSelectedInboundShippingRows] = useState<GridRowSelectionModel>([]);
  const [selectedStatementsRows, setSelectedStatementsRows] = useState<GridRowSelectionModel>([]);
  const [selectedFBMShippingRows, setSelectedFBMShippingRows] = useState<GridRowSelectionModel>([]);
  const [selectedAdsSpendRows, setSelectedAdsSpendRows] = useState<GridRowSelectionModel>([]);
  const [selectedAdsCreditCardPaymentRows, setSelectedAdsCreditCardPaymentRows] = useState<GridRowSelectionModel>([]);
  const [selectedQbAccountMappingRows, setSelectedQbAccountMappingRows] = useState<GridRowSelectionModel>([]);
  
  // State for search terms
  const [searchText, setSearchText] = useState('');
  
  // State for dialogs
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDeleteAllDialogOpen, setConfirmDeleteAllDialogOpen] = useState(false);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState(0);

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
        // Fetch table data
        const salesResponse = await amazonBIService.getAllOrders();
        setSalesData(salesResponse.map((item: AmazonOrder, index: number) => ({ ...item, id: item.id || index })));
        
        const skuEconomicsResponse = await amazonBIService.getAllSKUEconomics();
        setSkuEconomicsData(skuEconomicsResponse.map((item: SKUEconomics, index: number) => ({ ...item, id: item.id || index })));
        
        const inboundShippingResponse = await amazonBIService.getAllInboundShipping();
        setInboundShippingData(inboundShippingResponse.map((item: AmazonInboundShipping, index: number) => ({ ...item, id: item.id || index })));
        
        const statementsResponse = await amazonBIService.getAllStatements();
        setStatementsData(statementsResponse.map((item: AmazonStatement, index: number) => ({ ...item, id: item.id || index })));
        
        const fbmShippingResponse = await amazonBIService.getAllFBMShippingCost();
        setFbmShippingData(fbmShippingResponse.map((item: FBMShippingCost, index: number) => ({ ...item, id: item.id || index })));
        
        const adsSpendResponse = await amazonBIService.getAllAdsSpendByDay();
        setAdsSpendData(adsSpendResponse.map((item: AdsSpendByDay, index: number) => ({ ...item, id: item.id || index })));
        
        const adsCreditCardPaymentResponse = await amazonBIService.getAllAdsCreditCardPayment();
        setAdsCreditCardPaymentData(adsCreditCardPaymentResponse.map((item: AdsCreditCardPayment, index: number) => ({ ...item, id: item.id || index })));
        
        const qbAccountMappingResponse = await amazonBIService.getAllQBAccountMapping();
        setQbAccountMappingData(qbAccountMappingResponse.map((item: QBAccountIDMapping, index: number) => ({ ...item, id: item.id || index })));
      } catch (error) {
        console.error('Error fetching data:', error);
        enqueueSnackbar('Error loading data from server', { variant: 'error' });
      }
    };
    
    fetchData();
  }, [dataUpdated, enqueueSnackbar]);
  
  // Fetch latest records
  useEffect(() => {
    const fetchLatestRecords = async () => {
      try {
        // Fetch the latest records from each endpoint
        try {
          const latestOrderResponse = await amazonBIService.getLatestOrder();
          setLatestOrder(latestOrderResponse);
        } catch (error) {
          console.log('No latest order found');
        }
        
        try {
          const latestSKUResponse = await amazonBIService.getLatestSKUEconomics();
          setLatestSKUEconomics(latestSKUResponse);
        } catch (error) {
          console.log('No latest SKU economics record found');
        }
        
        try {
          const latestInboundResponse = await amazonBIService.getLatestInboundShipping();
          setLatestInboundShipping(latestInboundResponse);
        } catch (error) {
          console.log('No latest inbound shipping record found');
        }
        
        try {
          const latestStatementResponse = await amazonBIService.getLatestStatement();
          setLatestStatement(latestStatementResponse);
        } catch (error) {
          console.log('No latest statement record found');
        }
        
        try {
          const latestAdsSpendResponse = await amazonBIService.getLatestAdsSpendByDay();
          setLatestAdsSpend(latestAdsSpendResponse);
        } catch (error) {
          console.log('No latest ads spend record found');
        }
        
        try {
          const latestAdsCreditCardPaymentResponse = await amazonBIService.getLatestAdsCreditCardPayment();
          setLatestAdsCreditCardPayment(latestAdsCreditCardPaymentResponse);
        } catch (error) {
          console.log('No latest ad credit card payment record found');
        }
      } catch (error) {
        console.error('Error fetching latest records:', error);
      }
    };
    
    fetchLatestRecords();
  }, [dataUpdated]);

  // Filter function based on active tab and search text
  const filteredData = (): Array<Record<string, any>> => {
    // Format date strings for comparison
    const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
    const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';
    
    if (!searchText && (!startDateStr || !endDateStr)) {
      switch (activeTab) {
        case 0: return salesData as Array<Record<string, any>>;
        case 1: return skuEconomicsData as Array<Record<string, any>>;
        case 2: return inboundShippingData as Array<Record<string, any>>;
        case 3: return statementsData as Array<Record<string, any>>;
        case 4: return fbmShippingData as Array<Record<string, any>>;
        case 5: return adsSpendData as Array<Record<string, any>>;
        case 6: return adsCreditCardPaymentData as Array<Record<string, any>>;
        case 7: return qbAccountMappingData as Array<Record<string, any>>;
        default: return [];
      }
    }

    const lowerCaseSearch = searchText.toLowerCase();
    
    switch (activeTab) {
      case 0:
        return salesData.filter(item => {
          // Text search filtering
          const matchesSearch = !searchText || 
            Object.values(item).some(value => 
              value && value.toString().toLowerCase().includes(lowerCaseSearch)
            );
          
          // Date range filtering - purchase_date_pst_pdt
          let matchesDateRange = true;
          if (startDateStr && endDateStr && item.purchase_date_pst_pdt) {
            const itemDateStr = item.purchase_date_pst_pdt.toString().split('T')[0]; // Extract YYYY-MM-DD part
            matchesDateRange = itemDateStr >= startDateStr && itemDateStr <= endDateStr;
          }
          
          return matchesSearch && matchesDateRange;
        }) as Array<Record<string, any>>;
        
      case 1:
        return skuEconomicsData.filter(item => {
          // Text search filtering
          const matchesSearch = !searchText || 
            Object.values(item).some(value => 
              value && value.toString().toLowerCase().includes(lowerCaseSearch)
            );
          
          // Date range filtering - for SKU Economics we check if period is within the date range
          let matchesDateRange = true;
          if (startDateStr && endDateStr && item.start_date_pst_pdt && item.end_date_pst_pdt) {
            const startItemDateStr = item.start_date_pst_pdt.toString(); // Extract YYYY-MM-DD part
            const endItemDateStr = item.end_date_pst_pdt.toString(); // Extract YYYY-MM-DD part
            // Period is within filter range if start_date <= end_date_pst_pdt && end_date >= start_date_pst_pdt
            matchesDateRange = startDateStr <= endItemDateStr && endDateStr >= startItemDateStr;
          }
          
          return matchesSearch && matchesDateRange;
        }) as Array<Record<string, any>>;
        
      case 2:
        return inboundShippingData.filter(item => {
          // Text search filtering
          const matchesSearch = !searchText || 
            Object.values(item).some(value => 
              value && value.toString().toLowerCase().includes(lowerCaseSearch)
            );
          
          // Date range filtering - created_pst_pdt
          let matchesDateRange = true;
          if (startDateStr && endDateStr && item.created_pst_pdt) {
            const itemDateStr = item.created_pst_pdt.toString().split('T')[0]; // Extract YYYY-MM-DD part
            matchesDateRange = itemDateStr >= startDateStr && itemDateStr <= endDateStr;
          }
          
          return matchesSearch && matchesDateRange;
        }) as Array<Record<string, any>>;
        
      case 3:
        return statementsData.filter(item => {
          // Text search filtering
          const matchesSearch = !searchText || 
            Object.values(item).some(value => 
              value && value.toString().toLowerCase().includes(lowerCaseSearch)
            );
          
          // Date range filtering - posted_date_time_pst_pdt
          let matchesDateRange = true;
          if (startDateStr && endDateStr && item.posted_date_time_pst_pdt) {
            const itemDateStr = item.posted_date_time_pst_pdt.toString().split('T')[0]; // Extract YYYY-MM-DD part
            matchesDateRange = itemDateStr >= startDateStr && itemDateStr <= endDateStr;
          }
          
          return matchesSearch && matchesDateRange;
        }) as Array<Record<string, any>>;
        
      case 4:
        return fbmShippingData.filter(item => {
          // Text search filtering
          const matchesSearch = !searchText || 
            Object.values(item).some(value => 
              value && value.toString().toLowerCase().includes(lowerCaseSearch)
            );
          
          // Date range filtering - payment_date
          let matchesDateRange = true;
          if (startDateStr && endDateStr && item.payment_date) {
            const itemDateStr = item.payment_date.toString().split('T')[0]; // Extract YYYY-MM-DD part
            matchesDateRange = itemDateStr >= startDateStr && itemDateStr <= endDateStr;
          }
          
          return matchesSearch && matchesDateRange;
        }) as Array<Record<string, any>>;
        
      case 5:
        return adsSpendData.filter(item => {
          // Text search filtering
          const matchesSearch = !searchText || 
            Object.values(item).some(value => 
              value && value.toString().toLowerCase().includes(lowerCaseSearch)
            );
          
          // Date range filtering - date_by_day
          let matchesDateRange = true;
          if (startDateStr && endDateStr && item.date_by_day) {
            const itemDateStr = item.date_by_day.toString().split('T')[0]; // Extract YYYY-MM-DD part
            matchesDateRange = itemDateStr >= startDateStr && itemDateStr <= endDateStr;
          }
          
          return matchesSearch && matchesDateRange;
        }) as Array<Record<string, any>>;
        
      case 6:
        return adsCreditCardPaymentData.filter(item => {
          // Text search filtering
          const matchesSearch = !searchText || 
            Object.values(item).some(value => 
              value && value.toString().toLowerCase().includes(lowerCaseSearch)
            );
          
          // Date range filtering - issued_on
          let matchesDateRange = true;
          if (startDateStr && endDateStr && item.issued_on) {
            const itemDateStr = item.issued_on.toString().split('T')[0]; // Extract YYYY-MM-DD part
            matchesDateRange = itemDateStr >= startDateStr && itemDateStr <= endDateStr;
          }
          
          return matchesSearch && matchesDateRange;
        }) as Array<Record<string, any>>;
        
      case 7:
        return qbAccountMappingData.filter(item => {
          // Text search filtering
          const matchesSearch = !searchText || 
            Object.values(item).some(value => 
              value && value.toString().toLowerCase().includes(lowerCaseSearch)
            );
          
          return matchesSearch;
        }) as Array<Record<string, any>>;
        
      default:
        return [];
    }
  };

  // Column definitions for DataGrids
  const salesColumns: GridColDef[] = [
    { 
      field: 'amazon_order_id', 
      headerName: 'Amazon Order ID', 
      flex: 1.3, 
      minWidth: 130,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'purchase_date_pst_pdt', 
      headerName: 'Order Date (PST/PDT)', 
      flex: 1, 
      minWidth: 170,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'purchase_date_utc', 
      headerName: 'Order Date (UTC)', 
      flex: 1, 
      minWidth: 170,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'order_status', 
      headerName: 'Order Status', 
      flex: 0.8, 
      minWidth: 100,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'fulfillment_channel', 
      headerName: 'Fulfillment by', 
      flex: 0.8, 
      minWidth: 100,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'sku', 
      headerName: 'SKU', 
      flex: 1, 
      minWidth: 60,
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
      align: 'left',
      valueFormatter: (params) => params.value?.toLocaleString('en-US')
    },
    { 
      field: 'item_price', 
      headerName: 'Item Price', 
      type: 'number', 
      flex: 0.6, 
      minWidth: 90,
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
      field: 'item_tax', 
      headerName: 'Item Tax', 
      type: 'number', 
      flex: 0.6, 
      minWidth: 90,
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
      field: 'shipping_price', 
      headerName: 'Shipping Price', 
      type: 'number', 
      flex: 0.8, 
      minWidth: 120,
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
      field: 'shipping_tax', 
      headerName: 'Shipping Tax', 
      type: 'number', 
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
      field: 'gift_wrap_price', 
      headerName: 'Gift Wrap Price', 
      type: 'number', 
      flex: 0.9, 
      minWidth: 110,
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
      field: 'gift_wrap_tax', 
      headerName: 'Gift Wrap Tax', 
      type: 'number', 
      flex: 0.8, 
      minWidth: 85,
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
      field: 'item_promotion_discount', 
      headerName: 'Item Promotion Discount', 
      type: 'number', 
      flex: 1.4, 
      minWidth: 110,
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
      field: 'ship_promotion_discount', 
      headerName: 'Shipping Promotion Discount', 
      type: 'number', 
      flex: 1.7, 
      minWidth: 110,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (params.value == null) return '';
        return Number(params.value).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
    }
  ];

  const skuEconomicsColumns: GridColDef[] = [
    { 
      field: 'amazon_store', 
      headerName: 'Amazon Store', 
      flex: 1, 
      minWidth: 130,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'start_date_pst_pdt', 
      headerName: 'Period Start (PST/PDT)', 
      flex: 1, 
      minWidth: 130,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'end_date_pst_pdt', 
      headerName: 'Period End (PST/PDT)', 
      flex: 1, 
      minWidth: 130,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'msku', 
      headerName: 'SKU', 
      flex: 2, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'currency_code', 
      headerName: 'Currency', 
      flex: 1, 
      width: 90,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'sponsored_products_charge_total', 
      headerName: 'Ad Spend', 
      type: 'number', 
      flex: 1, 
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
      field: 'fba_fulfillment_fees_total', 
      headerName: 'FBA FulfillmentFees', 
      type: 'number', 
      flex: 1, 
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
      field: 'monthly_inventory_storage_fee_total', 
      headerName: 'FBA Storage Fee', 
      type: 'number', 
      flex: 1, 
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
    }
  ];

  const inboundShippingColumns: GridColDef[] = [
    { 
      field: 'shipment_name', 
      headerName: 'Shipment Name', 
      flex: 2, 
      minWidth: 150,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'shipment_id', 
      headerName: 'Shipment ID', 
      flex: 1, 
      minWidth: 130,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'created_pst_pdt', 
      headerName: 'Created Date (PST/PDT)', 
      flex: 1.5, 
      minWidth: 170,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (!params.value) return '';
        // Display the value exactly as received from the backend without any conversion
        return params.value.toString();
      }
    },
    { 
      field: 'last_updated_pst_pdt', 
      headerName: 'Last Updated (PST/PDT)', 
      flex: 1.5, 
      minWidth: 170,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (!params.value) return '';
        // Display the value exactly as received from the backend without any conversion
        return params.value.toString();
      }
    },
    { 
      field: 'ship_to', 
      headerName: 'Ship To', 
      flex: 1, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'units_expected', 
      headerName: 'Units Expected', 
      flex: 1, 
      type: 'number', 
      width: 120,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => params.value?.toLocaleString('en-US')
    },
    { 
      field: 'units_located', 
      headerName: 'Units Located', 
      flex: 1, 
      type: 'number', 
      width: 120,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => params.value?.toLocaleString('en-US')
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      flex: 1, 
      minWidth: 110,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'msku', 
      headerName: 'MSKU', 
      flex: 2, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'amazon_partnered_carrier_cost', 
      headerName: 'Carrier Cost', 
      type: 'number', 
      flex: 1, 
      minWidth: 110,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (params.value == null) return '';
        return Number(params.value).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
    }
  ];

  const statementsColumns: GridColDef[] = [
    { 
      field: 'settlement_id', 
      headerName: 'Settlement ID', 
      flex: 1.5, 
      minWidth: 130,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'deposit_date_pst_pdt', 
      headerName: 'Deposit Date (PST/PDT)', 
      flex: 1.8, 
      minWidth: 170,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (!params.value) return '';
        // Display the value as received from the backend (should be PST/PDT converted)
        return params.value.toString();
      }
    },
    { 
      field: 'deposit_date_utc', 
      headerName: 'Deposit Date (UTC)', 
      flex: 1.8, 
      minWidth: 170,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (!params.value) return '';
        // Display the value as received from the backend (should be UTC)
        return params.value.toString();
      }
    },
    { 
      field: 'marketplace_name', 
      headerName: 'Marketplace', 
      flex: 1, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'currency', 
      headerName: 'Currency', 
      flex: 0.7, 
      width: 90,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'total_amount', 
      headerName: 'Total Amount', 
      type: 'number', 
      flex: 1, 
      minWidth: 120,
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
      field: 'order_id', 
      headerName: 'Order ID', 
      flex: 2, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'sku', 
      headerName: 'SKU', 
      flex: 2.2, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'quantity_purchased', 
      headerName: 'Quantity', 
      type: 'number', 
      flex: 0.5, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => params.value?.toLocaleString('en-US')
    },
    { 
      field: 'transaction_type', 
      headerName: 'Transaction Type', 
      flex: 1, 
      minWidth: 140,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'amount_type', 
      headerName: 'Amount Type', 
      flex: 1, 
      minWidth: 140,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'amount_description', 
      headerName: 'Amount Description', 
      flex: 2, 
      minWidth: 140,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'amount', 
      headerName: 'Amount', 
      type: 'number', 
      flex: 1, 
      minWidth: 120,
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
      field: 'posted_date_time_pst_pdt', 
      headerName: 'Posted Date (PST/PDT)', 
      flex: 1.8, 
      minWidth: 170,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (!params.value) return '';
        // Display the value as received from the backend (should be PST/PDT converted)
        return params.value.toString();
      }
    }
  ];

  const fbmShippingColumns: GridColDef[] = [
    { 
      field: 'order_id', 
      headerName: 'Order ID', 
      flex: 1, 
      minWidth: 180,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'shipping_id', 
      headerName: 'Shipping ID', 
      flex: 1, 
      minWidth: 150,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'shipping_cost', 
      headerName: 'Shipping Cost', 
      type: 'number',
      flex: 1,
      minWidth: 120,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (params.value == null) return '';
        return `$${Number(params.value).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }
    },
    { 
      field: 'warehouse_cost', 
      headerName: 'Warehouse Cost', 
      type: 'number',
      flex: 1,
      minWidth: 120,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (params.value == null) return '';
        return `$${Number(params.value).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }
    },
    { 
      field: 'source', 
      headerName: 'Source', 
      flex: 1, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'payment_date', 
      headerName: 'Payment Date', 
      flex: 1,
      minWidth: 180,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
  ];

  const adsSpendColumns: GridColDef[] = [
    { 
      field: 'date_by_day', 
      headerName: 'Date', 
      flex: 1, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const dateStr = params.value.toString();
        
        // If it's in ISO format (YYYY-MM-DD), format it directly without Date object to avoid timezone issues
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateStr.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
        }
        
        // If not in expected format, return as-is
        return dateStr;
      }
    },
    { 
      field: 'sku', 
      headerName: 'Advertised SKU', 
      flex: 1.5, 
      minWidth: 150,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'spend', 
      headerName: 'Spend', 
      type: 'number',
      flex: 1,
      minWidth: 100,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (params.value == null) return '$0.00';
        return `$${Number(params.value).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }
    }
  ];

  const adsCreditCardPaymentColumns: GridColDef[] = [
    { 
      field: 'invoice_id', 
      headerName: 'Invoice ID', 
      flex: 1.5, 
      minWidth: 150,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'issued_on', 
      headerName: 'Issued On', 
      flex: 1, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const dateStr = params.value.toString();
        
        // If it's in ISO format (YYYY-MM-DD), format it directly without Date object to avoid timezone issues
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateStr.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
        }
        
        // If not in expected format, return as-is
        return dateStr;
      }
    },
    { 
      field: 'due_date', 
      headerName: 'Due Date', 
      flex: 1, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (!params.value) return '';
        const dateStr = params.value.toString();
        
        // If it's in ISO format (YYYY-MM-DD), format it directly without Date object to avoid timezone issues
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateStr.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
        }
        
        // If not in expected format, return as-is
        return dateStr;
      }
    },
    { 
      field: 'total_amount_billed', 
      headerName: 'Total Amount Billed', 
      type: 'number',
      flex: 1,
      minWidth: 150,
      headerAlign: 'left',
      align: 'left',
      valueFormatter: (params) => {
        if (params.value == null) return '$0.00';
        return `$${Number(params.value).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }
    }
  ];

  const qbAccountMappingColumns: GridColDef[] = [
    { 
      field: 'statement_category', 
      headerName: 'Statement Category', 
      flex: 1.5, 
      minWidth: 150,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'statement_pnl_items', 
      headerName: 'Statement PnL Items', 
      flex: 2, 
      minWidth: 200,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'pnl_account_name', 
      headerName: 'PnL Account Name', 
      flex: 1.5, 
      minWidth: 150,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'pnl_account_id', 
      headerName: 'PnL Account ID', 
      flex: 1, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'bs_account_name', 
      headerName: 'BS Account Name', 
      flex: 1.5, 
      minWidth: 150,
      headerAlign: 'left',
      align: 'left'
    },
    { 
      field: 'bs_account_id', 
      headerName: 'BS Account ID', 
      flex: 1, 
      minWidth: 120,
      headerAlign: 'left',
      align: 'left'
    }
  ];

  // Generic handler functions based on active tab
  const handleBulkUpload = () => {
    setBulkUploadOpen(true);
  };

  const handleDelete = () => {
    if (getCurrentSelectedRows().length === 0) return;
    setConfirmDialogOpen(true);
  };

  const handleDeleteAll = () => {
    setConfirmDeleteAllDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setLoading(true);
    const currentSelectedRows = getCurrentSelectedRows();
    if (!currentSelectedRows.length) return;
    
    switch (activeTab) {
      case 0: // Sales Records
        amazonBIService.deleteOrders(currentSelectedRows.map(id => ({ id: Number(id) })))
          .then(() => {
            enqueueSnackbar(`Successfully deleted ${currentSelectedRows.length} sales record(s)`, { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedSalesRows([]);
          })
          .catch(error => {
            console.error('Error deleting sales records:', error);
            enqueueSnackbar('Error deleting sales records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 1: // SKU Economics
        amazonBIService.deleteSKUEconomics(currentSelectedRows.map(id => ({ id: Number(id) })))
          .then(() => {
            enqueueSnackbar(`Successfully deleted ${currentSelectedRows.length} SKU economics record(s)`, { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedSkuEconomicsRows([]);
          })
          .catch(error => {
            console.error('Error deleting SKU economics records:', error);
            enqueueSnackbar('Error deleting SKU economics records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 2: // Inbound Shipping
        amazonBIService.deleteInboundShipping(currentSelectedRows.map(id => ({ id: Number(id) })))
          .then(() => {
            enqueueSnackbar(`Successfully deleted ${currentSelectedRows.length} inbound shipping record(s)`, { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedInboundShippingRows([]);
          })
          .catch(error => {
            console.error('Error deleting inbound shipping records:', error);
            enqueueSnackbar('Error deleting inbound shipping records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 3: // Statements
        amazonBIService.deleteStatements(currentSelectedRows.map(id => ({ id: Number(id) })))
          .then(() => {
            enqueueSnackbar(`Successfully deleted ${currentSelectedRows.length} statement record(s)`, { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedStatementsRows([]);
          })
          .catch(error => {
            console.error('Error deleting statement records:', error);
            enqueueSnackbar('Error deleting statement records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 4: // FBM Shipping
        amazonBIService.deleteFBMShippingCost(currentSelectedRows.map(id => ({ id: Number(id) })))
          .then(() => {
            enqueueSnackbar(`Successfully deleted ${currentSelectedRows.length} FBM shipping cost record(s)`, { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedFBMShippingRows([]);
          })
          .catch(error => {
            console.error('Error deleting FBM shipping cost records:', error);
            enqueueSnackbar('Error deleting FBM shipping cost records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 5: // Ad Spend by Day
        amazonBIService.deleteAdsSpendByDay(currentSelectedRows.map(id => ({ id: Number(id) })))
          .then(() => {
            enqueueSnackbar(`Successfully deleted ${currentSelectedRows.length} ad spend record(s)`, { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedAdsSpendRows([]);
          })
          .catch(error => {
            console.error('Error deleting ad spend records:', error);
            enqueueSnackbar('Error deleting ad spend records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 6: // Ad Credit Card Payment
        amazonBIService.deleteAdsCreditCardPayment(currentSelectedRows.map(id => ({ id: Number(id) })))
          .then(() => {
            enqueueSnackbar(`Successfully deleted ${currentSelectedRows.length} ad credit card payment record(s)`, { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedAdsCreditCardPaymentRows([]);
          })
          .catch(error => {
            console.error('Error deleting ad credit card payment records:', error);
            enqueueSnackbar('Error deleting ad credit card payment records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 7: // QB Account Mapping
        amazonBIService.deleteQBAccountMapping(currentSelectedRows.map(id => ({ id: Number(id) })))
          .then(() => {
            enqueueSnackbar(`Successfully deleted ${currentSelectedRows.length} QB Account Mapping record(s)`, { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedQbAccountMappingRows([]);
          })
          .catch(error => {
            console.error('Error deleting QB Account Mapping records:', error);
            enqueueSnackbar('Error deleting QB Account Mapping records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      default:
        setLoading(false);
        break;
    }
    setConfirmDialogOpen(false);
  };

  const handleConfirmDeleteAll = () => {
    setLoading(true);
    
    switch (activeTab) {
      case 0: // Sales Records
        amazonBIService.deleteAllOrders()
          .then(() => {
            enqueueSnackbar('Successfully deleted all sales records', { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedSalesRows([]);
          })
          .catch(error => {
            console.error('Error deleting all sales records:', error);
            enqueueSnackbar('Error deleting all sales records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 1: // SKU Economics
        amazonBIService.deleteAllSKUEconomics()
          .then(() => {
            enqueueSnackbar('Successfully deleted all SKU economics records', { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedSkuEconomicsRows([]);
          })
          .catch(error => {
            console.error('Error deleting all SKU economics records:', error);
            enqueueSnackbar('Error deleting all SKU economics records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 2: // Inbound Shipping
        amazonBIService.deleteAllInboundShipping()
          .then(() => {
            enqueueSnackbar('Successfully deleted all inbound shipping records', { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedInboundShippingRows([]);
          })
          .catch(error => {
            console.error('Error deleting all inbound shipping records:', error);
            enqueueSnackbar('Error deleting all inbound shipping records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 3: // Statements
        amazonBIService.deleteAllStatements()
          .then(() => {
            enqueueSnackbar('Successfully deleted all statement records', { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedStatementsRows([]);
          })
          .catch(error => {
            console.error('Error deleting all statement records:', error);
            enqueueSnackbar('Error deleting all statement records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 4: // FBM Shipping
        amazonBIService.deleteAllFBMShippingCost()
          .then(() => {
            enqueueSnackbar('Successfully deleted all FBM shipping cost records', { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedFBMShippingRows([]);
          })
          .catch(error => {
            console.error('Error deleting all FBM shipping cost records:', error);
            enqueueSnackbar('Error deleting all FBM shipping cost records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 5: // Ad Spend by Day
        amazonBIService.deleteAllAdsSpendByDay()
          .then(() => {
            enqueueSnackbar('Successfully deleted all ad spend records', { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedAdsSpendRows([]);
          })
          .catch(error => {
            console.error('Error deleting all ad spend records:', error);
            enqueueSnackbar('Error deleting all ad spend records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 6: // Ad Credit Card Payment
        amazonBIService.deleteAllAdsCreditCardPayment()
          .then(() => {
            enqueueSnackbar('Successfully deleted all ad credit card payment records', { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedAdsCreditCardPaymentRows([]);
          })
          .catch(error => {
            console.error('Error deleting all ad credit card payment records:', error);
            enqueueSnackbar('Error deleting all ad credit card payment records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      case 7: // QB Account Mapping
        amazonBIService.deleteAllQBAccountMapping()
          .then(() => {
            enqueueSnackbar('Successfully deleted all QB Account Mapping records', { variant: 'success' });
            setDataUpdated(prev => !prev); // Trigger data refresh
            setSelectedQbAccountMappingRows([]);
          })
          .catch(error => {
            console.error('Error deleting all QB Account Mapping records:', error);
            enqueueSnackbar('Error deleting all QB Account Mapping records', { variant: 'error' });
          })
          .finally(() => setLoading(false));
        break;
      default:
        setLoading(false);
        break;
    }
    setConfirmDeleteAllDialogOpen(false);
  };

  const handleDownloadCSV = () => {
    const data = filteredData();
    if (data.length === 0) return;
    
    let columns: GridColDef[] = [];
    let filename = '';
    
    switch (activeTab) {
      case 0: // Sales Records
        columns = salesColumns;
        filename = 'amazon_sales_records.csv';
        break;
      case 1: // SKU Economics
        columns = skuEconomicsColumns;
        filename = 'amazon_sku_economics.csv';
        break;
      case 2: // Inbound Shipping
        columns = inboundShippingColumns;
        filename = 'amazon_inbound_shipping.csv';
        break;
      case 3: // Statements
        columns = statementsColumns;
        filename = 'amazon_statements.csv';
        break;
      case 4: // FBM Shipping
        columns = fbmShippingColumns;
        filename = 'amazon_fbm_shipping_cost.csv';
        break;
      case 5: // Ad Spend by Day
        columns = adsSpendColumns;
        filename = 'amazon_ads_spend_by_day.csv';
        break;
      case 6: // Ad Credit Card Payment
        columns = adsCreditCardPaymentColumns;
        filename = 'amazon_ads_credit_card_payment.csv';
        break;
      case 7: // QB Account Mapping
        columns = qbAccountMappingColumns;
        filename = 'qb_account_mapping.csv';
        break;
      default:
        return;
    }
    
    // Create content - always using commas for CSV
    const headers = columns.map(col => col.headerName).join(',');
    const dataRows = data.map(item => 
      columns.map(col => {
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
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Handler for bulk upload data
  const handleBulkUploadData = (data: any[], tab: string) => {
    setLoading(true);
    let successMessage = '';

    // Process data for each tab to ensure proper formatting for the API
    if (tab === 'sales') {
      // Process All Orders data
      data = data.map(item => {
        // Make sure numeric fields are numbers
        const numericFields = [
          'quantity', 'item_price', 'item_tax', 'shipping_price', 
          'shipping_tax', 'gift_wrap_price', 'gift_wrap_tax', 
          'item_promotion_discount', 'ship_promotion_discount'
        ];
        
        numericFields.forEach(field => {
          if (item[field] !== undefined) {
            item[field] = typeof item[field] === 'string' 
              ? parseFloat(item[field]) 
              : item[field];
          }
        });
        
        // Ensure sales_channel field is available and properly formatted
        if (!item.sales_channel) {
          console.warn('Missing sales_channel field in a record, setting to empty string');
          item.sales_channel = '';
        }
        
        return item;
      });
      
      // Double check if the data contains only the allowed sales channels
      // This filtering should already have happened in BulkUploadDialog, but we do it again for safety
      const originalCount = data.length;
      data = data.filter(item => ALLOWED_SALES_CHANNELS.includes(item.sales_channel));
      
      if (data.length === 0) {
        setLoading(false);
        enqueueSnackbar(`Error: No records match the allowed sales channels (${ALLOWED_SALES_CHANNELS.join(', ')})`, 
          { variant: 'error' });
        setBulkUploadOpen(false);
        return;
      }
      
      if (data.length < originalCount) {
        console.log(`Filtered ${originalCount - data.length} records that didn't match allowed sales channels`);
      }
    } else if (tab === 'skuEconomics') {
      // Process SKU Economics data
      data = data.map(item => {
        // Make sure numeric fields are numbers
        const numericFields = [
          'FBA_fulfillment_fees_total', 'sponsored_products_charge_total',
          'monthly_inventory_storage_fee_total', 'inbound_transportation_charge_total'
        ];
        
        numericFields.forEach(field => {
          if (item[field] !== undefined) {
            item[field] = typeof item[field] === 'string' 
              ? parseFloat(item[field]) 
              : item[field];
          }
        });
        
        // Ensure dates are properly formatted for the backend's expected format
        if (item.start_date_pst_pdt && typeof item.start_date_pst_pdt === 'string') {
          // The backend expects dates in the format MM/DD/YYYY
          const date = new Date(item.start_date_pst_pdt);
          if (!isNaN(date.getTime())) {
            item.start_date_pst_pdt = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
          }
        }
        
        if (item.end_date_pst_pdt && typeof item.end_date_pst_pdt === 'string') {
          const date = new Date(item.end_date_pst_pdt);
          if (!isNaN(date.getTime())) {
            item.end_date_pst_pdt = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
          }
        }
        
        return item;
      });
    } else if (tab === 'inboundShipping') {
      // Process Inbound Shipping data
      data = data.map(item => {
        // Make sure numeric fields are numbers
        const numericFields = [
          'units_expected', 'units_located', 'amazon_partnered_carrier_cost'
        ];
        
        numericFields.forEach(field => {
          if (item[field] !== undefined) {
            item[field] = typeof item[field] === 'string' 
              ? parseFloat(item[field]) 
              : item[field];
          }
        });
        
        // Handle created_pst_pdt and last_updated_pst_pdt dates
        // The backend expects dates in the format "Mar 29, 2024, 10:50 a.m."
        // Keep the dates as they are from the template, assuming they are in the correct format
        
        return item;
      });
    } else if (tab === 'statements') {
      // Process Statements data
      data = data.map(item => {
        // Make sure numeric fields are numbers
        const numericFields = [
          'total_amount', 'amount', 'quantity_purchased'
        ];
        
        numericFields.forEach(field => {
          if (item[field] !== undefined) {
            item[field] = typeof item[field] === 'string' 
              ? parseFloat(item[field]) 
              : item[field];
          }
        });
        return item;
      });
    } else if (tab === 'fbmShipping') {
      // Process FBM Shipping data
      data = data.map(item => {
        // Make sure numeric fields are numbers
        if (item.shipping_cost !== undefined) {
          item.shipping_cost = typeof item.shipping_cost === 'string' 
            ? parseFloat(item.shipping_cost) 
            : item.shipping_cost;
        }
        
        if (item.warehouse_cost !== undefined) {
          item.warehouse_cost = typeof item.warehouse_cost === 'string' 
            ? parseFloat(item.warehouse_cost) 
            : item.warehouse_cost;
        }
        
        // Format payment_date if needed
        if (item.payment_date && typeof item.payment_date === 'string') {
          const date = new Date(item.payment_date);
          if (!isNaN(date.getTime())) {
            // Keep the original format if it's already a valid date string
            item.payment_date = item.payment_date;
          }
        }
        
        return item;
      });
    } else if (tab === 'adsSpend') {
      // Process Ad Spend by Day data
      data = data.map(item => {
        // Make sure spend field is a number
        if (item.spend !== undefined) {
          item.spend = typeof item.spend === 'string' 
            ? parseFloat(item.spend) 
            : item.spend;
        }
        
        // Map column names from Excel to API expected names
        if (item.Date) {
          item.date_by_day = item.Date;
          delete item.Date;
        }
        if (item['Advertised SKU']) {
          item.sku = item['Advertised SKU'];
          delete item['Advertised SKU'];
        }
        if (item.Spend !== undefined) {
          item.spend = typeof item.Spend === 'string' 
            ? parseFloat(item.Spend) 
            : item.Spend;
          delete item.Spend;
        }
        
        return item;
      });
    } else if (tab === 'adsCreditCardPayment') {
      // Process Ad Credit Card Payment data
      data = data.map(item => {
        // Make sure total_amount_billed field is a number
        if (item.total_amount_billed !== undefined) {
          item.total_amount_billed = typeof item.total_amount_billed === 'string' 
            ? parseFloat(item.total_amount_billed) 
            : item.total_amount_billed;
        }
        
        // Map column names from CSV to API expected names
        if (item.Invoice) {
          item.invoice_id = item.Invoice;
          delete item.Invoice;
        }
        if (item['Issued on']) {
          item.issued_on = item['Issued on'];
          delete item['Issued on'];
        }
        if (item['Due date']) {
          item.due_date = item['Due date'];
          delete item['Due date'];
        }
        if (item['Total amount billed'] !== undefined) {
          item.total_amount_billed = typeof item['Total amount billed'] === 'string' 
            ? parseFloat(item['Total amount billed']) 
            : item['Total amount billed'];
          delete item['Total amount billed'];
        }
        
        return item;
      });
    } else if (tab === 'qbAccountMapping') {
      // Process QB Account Mapping data
      data = data.map(item => {
        // Make sure numeric fields are numbers
        if (item.pnl_account_id !== undefined && item.pnl_account_id !== null) {
          item.pnl_account_id = typeof item.pnl_account_id === 'string' 
            ? parseInt(item.pnl_account_id, 10) 
            : item.pnl_account_id;
        }
        
        if (item.bs_account_id !== undefined && item.bs_account_id !== null) {
          item.bs_account_id = typeof item.bs_account_id === 'string' 
            ? parseInt(item.bs_account_id, 10) 
            : item.bs_account_id;
        }
        
        return item;
      });
    }

    // Set success message based on tab
    switch (tab) {
      case 'sales':
        successMessage = 'Amazon sales records uploaded successfully!';
        break;
      case 'skuEconomics':
        successMessage = 'SKU economics data uploaded successfully!';
        break;
      case 'inboundShipping':
        successMessage = 'Inbound shipping data uploaded successfully!';
        break;
      case 'statements':
        successMessage = 'Statements data uploaded successfully!';
        break;
      case 'fbmShipping':
        successMessage = 'FBM shipping cost data uploaded successfully!';
        break;
      case 'adsSpend':
        successMessage = 'Ad spend data uploaded successfully!';
        break;
      case 'adsCreditCardPayment':
        successMessage = 'Ad credit card payment data uploaded successfully!';
        break;
      case 'qbAccountMapping':
        successMessage = 'QB Account Mapping data uploaded successfully!';
        break;
      default:
        setLoading(false);
        return;
    }

    // Call the appropriate service method based on tab
    let apiPromise;
    switch (tab) {
      case 'sales':
        apiPromise = amazonBIService.createOrders(data);
        break;
      case 'skuEconomics':
        apiPromise = amazonBIService.createSKUEconomics(data);
        break;
      case 'inboundShipping':
        apiPromise = amazonBIService.createInboundShipping(data);
        break;
      case 'statements':
        apiPromise = amazonBIService.createStatements(data);
        break;
      case 'fbmShipping':
        apiPromise = amazonBIService.createFBMShippingCost(data);
        break;
      case 'adsSpend':
        apiPromise = amazonBIService.createAdsSpendByDay(data);
        break;
      case 'adsCreditCardPayment':
        apiPromise = amazonBIService.createAdsCreditCardPayment(data);
        break;
      case 'qbAccountMapping':
        apiPromise = amazonBIService.createQBAccountMapping(data);
        break;
      default:
        setLoading(false);
        return;
    }

    apiPromise
      .then(response => {
        enqueueSnackbar(successMessage, { variant: 'success' });
        setDataUpdated(prev => !prev); // Toggle to trigger a re-fetch
      })
      .catch(error => {
        console.error('Bulk upload error:', error);
        enqueueSnackbar(
          `Error: ${error.response?.data?.error || 'Failed to upload data'}`, 
          { variant: 'error' }
        );
      })
      .finally(() => {
        setLoading(false);
        setBulkUploadOpen(false);
      });
  };

  // Get current selected rows based on active tab
  const getCurrentSelectedRows = () => {
    switch (activeTab) {
      case 0: return selectedSalesRows;
      case 1: return selectedSkuEconomicsRows;
      case 2: return selectedInboundShippingRows;
      case 3: return selectedStatementsRows;
      case 4: return selectedFBMShippingRows;
      case 5: return selectedAdsSpendRows;
      case 6: return selectedAdsCreditCardPaymentRows;
      case 7: return selectedQbAccountMappingRows;
      default: return [];
    }
  };

  // Get appropriate placeholder text for search based on active tab
  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case 0: return 'Search sales records...';
      case 1: return 'Search SKU economics...';
      case 2: return 'Search inbound shipping...';
      case 3: return 'Search statements...';
      case 4: return 'Search FBM shipping costs...';
      case 5: return 'Search ad spend records...';
      case 6: return 'Search ad credit card payment records...';
      case 7: return 'Search QB account mapping records...';
      default: return 'Search...';
    }
  };

  // Get appropriate confirm dialog content based on active tab
  const getConfirmDialogContent = () => {
    const count = getCurrentSelectedRows().length;
    switch (activeTab) {
      case 0: return `Are you sure you want to delete ${count} selected sales record${count !== 1 ? 's' : ''}?`;
      case 1: return `Are you sure you want to delete ${count} selected SKU economics record${count !== 1 ? 's' : ''}?`;
      case 2: return `Are you sure you want to delete ${count} selected inbound shipping record${count !== 1 ? 's' : ''}?`;
      case 3: return `Are you sure you want to delete ${count} selected statement record${count !== 1 ? 's' : ''}?`;
      case 4: return `Are you sure you want to delete ${count} selected FBM shipping cost record${count !== 1 ? 's' : ''}?`;
      case 5: return `Are you sure you want to delete ${count} selected ad spend record${count !== 1 ? 's' : ''}?`;
      case 6: return `Are you sure you want to delete ${count} selected ad credit card payment record${count !== 1 ? 's' : ''}?`;
      case 7: return `Are you sure you want to delete ${count} selected QB account mapping record${count !== 1 ? 's' : ''}?`;
      default: return 'Are you sure you want to delete the selected records?';
    }
  };

  // Get appropriate confirm delete all dialog content based on active tab
  const getConfirmDeleteAllDialogContent = () => {
    switch (activeTab) {
      case 0: return 'Are you sure you want to delete ALL sales records? This action cannot be undone.';
      case 1: return 'Are you sure you want to delete ALL SKU economics records? This action cannot be undone.';
      case 2: return 'Are you sure you want to delete ALL inbound shipping records? This action cannot be undone.';
      case 3: return 'Are you sure you want to delete ALL statement records? This action cannot be undone.';
      case 4: return 'Are you sure you want to delete ALL FBM shipping cost records? This action cannot be undone.';
      case 5: return 'Are you sure you want to delete ALL ad spend records? This action cannot be undone.';
      case 6: return 'Are you sure you want to delete ALL ad credit card payment records? This action cannot be undone.';
      case 7: return 'Are you sure you want to delete ALL QB account mapping records? This action cannot be undone.';
      default: return 'Are you sure you want to delete ALL records? This action cannot be undone.';
    }
  };

  // Get date filter tooltip text based on active tab
  const getDateFilterTooltip = () => {
    switch (activeTab) {
      case 0:
        return "Filter Sales Records by Purchase Date (PST/PDT)";
      case 1:
        return "Filter SKU Economics Records by Start Date and End Date (PST/PDT)";
      case 2:
        return "Filter Inbound Shipping Records by Created Date (PST/PDT)";
      case 3:
        return "Filter Statements Records by Posted Date (PST/PDT)";
      case 4:
        return "Filter FBM Shipping Cost Records by Payment Date";
      case 5:
        return "Filter Ad Spend Records by Date";
      case 6:
        return "Filter Ad Credit Card Payment Records by Date";
      default:
        return "Set Display Period for Data Display";
    }
  };

  return (
    <BasePage>
      {/* Summary Cards */}
      <Box sx={{ height: '25%', maxHeight: '200px', mb: 2, mt: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          <Grid item xs={12} sm={6} md={2.4} sx={{ height: '100%' }}>
            <CardContainer sx={{ height: '100%', overflow: 'hidden' }}>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest Sales Record
              </CardTitle>
              <CardContent>
                {latestOrder ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestOrder.amazon_order_id}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestOrder.purchase_date_pst_pdt} (PST/PDT)
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No sales records available</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4} sx={{ height: '100%' }}>
            <CardContainer>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest SKU Economics Record
              </CardTitle>
              <CardContent>
                {latestSKUEconomics ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestSKUEconomics.start_date_pst_pdt} - {latestSKUEconomics.end_date_pst_pdt}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No SKU economics records available</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4} sx={{ height: '100%' }}>
            <CardContainer>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest FBA Inbound Record
              </CardTitle>
              <CardContent>
                {latestInboundShipping ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestInboundShipping.shipment_id}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestInboundShipping.created_pst_pdt} (PST/PDT)
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No inbound shipping records available</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4} sx={{ height: '100%' }}>
            <CardContainer>
              <CardTitle variant="subtitle1">
                <ReceiptIcon fontSize="small" />
                Latest Statement Record
              </CardTitle>
              <CardContent>
                {latestStatement ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" fontSize="1.2rem" color="black" mt={1} mb={1}>
                      {latestStatement.settlement_id}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" fontSize="1rem" color="black">
                      {latestStatement.settlement_start_date_pst_pdt} - {latestStatement.settlement_end_date_pst_pdt}: ${Number(latestStatement.total_amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" fontWeight="medium" fontSize="1rem" mt={1} mb={1}>No statement records available</Typography>
                )}
              </CardContent>
            </CardContainer>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4} sx={{ height: '100%' }}>
            <Tooltip title={getDateFilterTooltip()} placement="top">
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
          startIcon={<UploadIcon />}
          onClick={handleBulkUpload}
        >
          Bulk Upload
        </Button>
        <Button 
          variant="contained" 
          startIcon={<DeleteIcon />}
          color="error"
          disabled={getCurrentSelectedRows().length === 0}
          onClick={handleDelete}
        >
          Delete
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
        >
          Download
        </Button>
      </Box>

      {/* Tabs for switching between data types */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => {
            setActiveTab(newValue);
            // Reset selections when changing tabs
            setSelectedSalesRows([]);
            setSelectedSkuEconomicsRows([]);
            setSelectedInboundShippingRows([]);
            setSelectedStatementsRows([]);
            setSelectedFBMShippingRows([]);
            setSelectedAdsSpendRows([]);
            setSelectedAdsCreditCardPaymentRows([]);
            setSelectedQbAccountMappingRows([]);
            // Reset filters
            setSearchText('');
            setStartDate(null);
            setEndDate(null);
          }}
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
          <Tab label="All Orders" />
          <Tab label="SKU Economics" />
          <Tab label="Inbound Shipping" />
          <Tab label="Statements" />
          <Tab label="FBM Shipping" />
          <Tab label="Ad Spend by Day" />
          <Tab label="Ad Credit Card Payment" />
          <Tab label="QB Account Mapping" />
        </Tabs>
      </Box>

      {/* Search Input */}
      <Box sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder={getSearchPlaceholder()}
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
      {activeTab === 0 && (
        <DataGrid
          rows={filteredData()}
          columns={salesColumns}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 9 } },
          }}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedSalesRows(newSelection);
          }}
          rowSelectionModel={selectedSalesRows}
          sx={{ ...dataGridStyles, height: '100%', minHeight: '200px' }}
        />
      )}

      {activeTab === 1 && (
        <DataGrid
          rows={filteredData()}
          columns={skuEconomicsColumns}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 9 } },
          }}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedSkuEconomicsRows(newSelection);
          }}
          rowSelectionModel={selectedSkuEconomicsRows}
          sx={{ ...dataGridStyles, height: '100%', minHeight: '200px' }}
        />
      )}

      {activeTab === 2 && (
        <DataGrid
          rows={filteredData()}
          columns={inboundShippingColumns}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 9 } },
          }}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedInboundShippingRows(newSelection);
          }}
          rowSelectionModel={selectedInboundShippingRows}
          sx={{ ...dataGridStyles, height: '100%', minHeight: '200px' }}
        />
      )}

      {activeTab === 3 && (
        <DataGrid
          rows={filteredData()}
          columns={statementsColumns}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 9 } },
          }}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedStatementsRows(newSelection);
          }}
          rowSelectionModel={selectedStatementsRows}
          sx={{ ...dataGridStyles, height: '100%', minHeight: '200px' }}
        />
      )}
      
      {activeTab === 4 && (
        <DataGrid
          rows={filteredData()}
          columns={fbmShippingColumns}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: {
              sortModel: [{ field: 'payment_date', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedFBMShippingRows(newSelection);
          }}
          rowSelectionModel={selectedFBMShippingRows}
          sx={{ ...dataGridStyles, height: '100%', minHeight: '500px' }}
        />
      )}
      
      {activeTab === 5 && (
        <DataGrid
          rows={filteredData()}
          columns={adsSpendColumns}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: {
              sortModel: [{ field: 'date_by_day', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedAdsSpendRows(newSelection);
          }}
          rowSelectionModel={selectedAdsSpendRows}
          sx={{ ...dataGridStyles, height: '100%', minHeight: '400px' }}
        />
      )}

      {activeTab === 6 && (
        <DataGrid
          rows={filteredData()}
          columns={adsCreditCardPaymentColumns}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: {
              sortModel: [{ field: 'issued_on', sort: 'desc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedAdsCreditCardPaymentRows(newSelection);
          }}
          rowSelectionModel={selectedAdsCreditCardPaymentRows}
          sx={{ ...dataGridStyles, height: '100%', minHeight: '400px' }}
        />
      )}

      {activeTab === 7 && (
        <DataGrid
          rows={filteredData()}
          columns={qbAccountMappingColumns}
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: {
              sortModel: [{ field: 'statement_category', sort: 'asc' }],
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedQbAccountMappingRows(newSelection);
          }}
          rowSelectionModel={selectedQbAccountMappingRows}
          sx={{ ...dataGridStyles, height: '100%', minHeight: '400px' }}
        />
      )}

      {/* Dialogs */}
      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUpload={handleBulkUploadData}
        activeTab={activeTab}
        loading={loading}
      />
      
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Delete"
        content={getConfirmDialogContent()}
      />
      
      <ConfirmDialog
        open={confirmDeleteAllDialogOpen}
        onClose={() => setConfirmDeleteAllDialogOpen(false)}
        onConfirm={handleConfirmDeleteAll}
        title="Confirm Delete All"
        content={getConfirmDeleteAllDialogContent()}
      />
    </BasePage>
  );
};

export default AmazonBIInput; 