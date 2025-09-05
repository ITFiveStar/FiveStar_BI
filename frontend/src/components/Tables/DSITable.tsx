import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography, 
  CircularProgress 
} from '@mui/material';
import axios from 'axios';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import DisabledByDefaultIcon from '@mui/icons-material/DisabledByDefault';

interface DSITableProps {
  dateUpTo?: Date | null;
  brand?: string;
  ir?: string;
  sku?: string;
}

interface DSIData {
  SKU: string;
  DSI_30days: number | null;
  DSI_60days: number | null;
  DSI_90days: number | null;
  PO_cost_trend: boolean;
  Consider_Repurchase_Flag: boolean;
  Flag_Reason: string | null;
}

// Add this function at the top level before the component
const parseJsonWithNaN = (jsonString: string): any => {
  // Replace NaN with null before parsing
  const sanitizedJson = jsonString.replace(/:\s*NaN/g, ': null');
  return JSON.parse(sanitizedJson);
};

const DSITable: React.FC<DSITableProps> = ({ dateUpTo, brand, ir, sku }) => {
  const [data, setData] = useState<DSIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (dateUpTo) {
          const y = dateUpTo.getFullYear();
          const m = String(dateUpTo.getMonth() + 1).padStart(2, '0');
          const d = String(dateUpTo.getDate()).padStart(2, '0');
          params.append('dateUpTo', `${y}-${m}-${d}`);
        }
        if (brand?.trim()) params.append('brand', brand);
        if (ir?.trim()) params.append('ir', ir);
        if (sku?.trim()) params.append('sku', sku);

        const response = await axios.get(`/cogs_details/dsi?${params.toString()}`);
        const responseData = response.data;

        console.log('✅ Final response data:', responseData);
        console.log('Response data type:', typeof responseData);
        console.log('Is array?', Array.isArray(responseData));

        let parsedData: DSIData[] = [];
        try {
          if (typeof responseData === 'string') {
            // The response is a JSON string with NaN values, use custom parser
            console.log('Attempting to parse JSON string with NaN values...');
            parsedData = parseJsonWithNaN(responseData);
            console.log('Successfully parsed JSON string to:', parsedData);
          } else if (Array.isArray(responseData)) {
            // Already an array, use directly
            parsedData = responseData;
          } else {
            console.error('❌ Response is neither a string nor an array:', responseData);
            throw new Error('Invalid response format');
          }
          
          // Validate the parsed data is an array
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log('Setting data with parsed array:', parsedData.length, 'items');
            setData(parsedData);
            setError(null);
          } else {
            console.error('❌ Parsed data is not a valid array:', parsedData);
            setError('No data available');
            setData([]);
          }
        } catch (innerErr) {
          console.error('❌ Error processing response data:', innerErr);
          setError('Error processing data');
          setData([]);
        }
      } catch (err) {
        console.error('❌ Error fetching DSI data:', err);
        setError('Failed to load DSI data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateUpTo, brand, ir, sku]);

  const formatDSI = (value: number | null | undefined): string => {
    if (typeof value !== 'number' || isNaN(value)) return '-';
    return value.toFixed(0);
  };  

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography component="div" color="error" align="center">
          {error}
        </Typography>
      </Box>
    );
  }

  console.log('DSI data array:', data);
  console.log('Data type:', typeof data);
  console.log('Data length:', data.length);
  console.log('Is array?', Array.isArray(data));

  if (data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography component="div" color="text.secondary" align="center">
          No DSI data available for the selected filters
        </Typography>
      </Box>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    if (a.SKU === 'Total') return -1;
    if (b.SKU === 'Total') return 1;
    return 0;
  });

  return (
    <TableContainer component={Paper} sx={{ height: '100%', maxHeight: '100%', boxShadow: 'none', overflow: 'auto' }}>
      <Table stickyHeader size="small" sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>SKU</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>30 Days DSI</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>60 Days DSI</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>90 Days DSI</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>PO Cost Trend</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Stock Up Suggestion</TableCell>
            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Suggestion Reason</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow
              key={row.SKU || index}
              sx={{ 
                '&:last-child td, &:last-child th': { border: 0 },
                backgroundColor: row.SKU === 'Total' ? '#f0f7ff' : 'inherit',
                fontWeight: row.SKU === 'Total' ? 'bold' : 'normal',
              }}
            >
              <TableCell 
                component="th" 
                scope="row"
                sx={{ fontWeight: row.SKU === 'Total' ? 'bold' : 'normal' }}
              >
                {row.SKU}
              </TableCell>
              <TableCell 
                align="right"
                sx={{ 
                  fontWeight: row.SKU === 'Total' ? 'bold' : 'normal',
                  color: row.DSI_30days !== null && row.DSI_30days > 60 ? '#d32f2f' : 'inherit'
                }}
              >
                {formatDSI(row.DSI_30days)}
              </TableCell>
              <TableCell 
                align="right"
                sx={{ 
                  fontWeight: row.SKU === 'Total' ? 'bold' : 'normal',
                  color: row.DSI_60days !== null && row.DSI_60days > 60 ? '#d32f2f' : 'inherit'
                }}
              >
                {formatDSI(row.DSI_60days)}
              </TableCell>
              <TableCell 
                align="right"
                sx={{ 
                  fontWeight: row.SKU === 'Total' ? 'bold' : 'normal',
                  color: row.DSI_90days !== null && row.DSI_90days > 60 ? '#d32f2f' : 'inherit'
                }}
              >
                {formatDSI(row.DSI_90days)}
              </TableCell>
              {/* PO Cost Trend column */}
              <TableCell 
                align="center"
                sx={{ 
                  fontWeight: row.SKU === 'Total' ? 'bold' : 'normal'
                }}
              >
                {row.SKU !== 'Total' ? (
                  row.PO_cost_trend ? 
                    <ArrowUpwardIcon fontSize="small" sx={{ color: '#d32f2f' }} /> : 
                    <span style={{ color: '#2e7d32' }}>=</span>
                ) : ''}
              </TableCell>
              {/* Consider Repurchase Flag column */}
              <TableCell 
                align="center"
                sx={{ 
                  fontWeight: row.SKU === 'Total' ? 'bold' : 'normal'
                }}
              >
                {row.SKU !== 'Total' ? (
                  row.Consider_Repurchase_Flag ? 
                    <CheckBoxIcon fontSize="small" sx={{ color: '#2e7d32' }} /> : 
                    <DisabledByDefaultIcon fontSize="small" sx={{ color: '#9e9e9e' }} />
                ) : ''}
              </TableCell>
              {/* Flag Reason column */}
              <TableCell 
                sx={{ 
                  fontWeight: row.SKU === 'Total' ? 'bold' : 'normal'
                }}
              >
                {row.SKU !== 'Total' ? (row.Flag_Reason || '') : ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DSITable;
