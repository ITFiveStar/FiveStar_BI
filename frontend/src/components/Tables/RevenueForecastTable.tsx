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
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

// Define custom styles for the table
const tableStyles = {
  headerCell: {
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
    fontSize: '12px', // Match axis label font size from nivoTheme
    padding: '6px 16px', // Reduce vertical padding from default
    height: '32px', // Set a fixed shorter height for header
  },
  cell: {
    fontSize: '12px', // Match axis label font size from nivoTheme
  },
  forecastCell: {
    fontSize: '12px', // Match axis label font size from nivoTheme
    color: '#fc8d62',
    fontWeight: 'bold',
  }
};

interface RevenueForecastTableProps {
  dateUpTo?: Date | null;
  brand?: string;
  ir?: string;
  sku?: string;
  revenueMethod: string;
  revenueTarget?: string;
  revenueGrowthRate?: string;
  dsiPeriod: string;
  dsiMethod: string;
  dsiTarget?: string;
  dsiChangeRate?: string;
  scenario?: string;
}

interface MonthValue {
  type: 'actual' | 'forecast';
  value: number;
}

const RevenueForecastTable: React.FC<RevenueForecastTableProps> = ({
  dateUpTo,
  brand,
  ir,
  sku,
  revenueMethod,
  revenueTarget,
  revenueGrowthRate,
  dsiPeriod,
  dsiMethod,
  dsiTarget,
  dsiChangeRate,
  scenario = '1',
}) => {
  const [tableData, setTableData] = useState<Record<string, Record<string, Record<string, MonthValue>>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Define the metrics we want to display and their order
  const metricsToDisplay = [
    'applied_growth_rate_revenue',
    'DSI',
    'applied_growth_rate_DSI',
    'COGS',
    'avg_inventory',
    'cumulative_procurement_AP_with_payment',
    'AP_to_inventory_ratio'
  ];

  // Map of internal metric names to display names
  const metricDisplayNames: Record<string, string> = {
    'applied_growth_rate_revenue': 'Revenue MoM Change',
    'DSI': 'DSI',
    'applied_growth_rate_DSI': 'DSI MoM Change',
    'COGS': 'COGS',
    'avg_inventory': 'Avg Inventory',
    'cumulative_procurement_AP_with_payment': 'Procurement AP',
    'AP_to_inventory_ratio': 'AP to Inventory'
  };

  // Format functions for different metric types
  const formatMetricValue = (metric: string, value: number): string => {
    if (value == null) return '-';
    
    switch(metric) {
      case 'DSI':
        return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
      case 'applied_growth_rate_DSI':
      case 'applied_growth_rate_revenue':
        return `${(value * 100).toFixed(1)}%`;
      case 'COGS':
      case 'avg_inventory':
      case 'cumulative_procurement_AP_with_payment':
        return `$${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k`;
      case 'AP_to_inventory_ratio':
        return value.toFixed(1);
      default:
        return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
  };

  const formatDateForAPI = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateUpTo) params.append('dateUpTo', formatDateForAPI(dateUpTo));
        if (brand) params.append('brand', brand);
        if (ir) params.append('ir', ir);
        if (sku) params.append('sku', sku);

        params.append('forecast_revenue_method', revenueMethod);
        if (revenueMethod === 'target_revenue' && revenueTarget) {
          params.append('year_end_total_revenue_target', revenueTarget);
        }
        if (revenueMethod === 'flat_growth' && revenueGrowthRate) {
          params.append('input_growth_rate', revenueGrowthRate);
        }

        params.append('forecast_DSI_method', dsiMethod);
        if (dsiMethod === 'target_DSI' && dsiTarget) {
          params.append('year_end_DSI_target', dsiTarget);
        }
        if (dsiMethod === 'flat_change' && dsiChangeRate) {
          params.append('input_DSI_change_rate', dsiChangeRate);
        }

        params.append('DSI_period_in_days', dsiPeriod);
        params.append('scenario', scenario);

        const res = await axios.get(`/evaluate_strategy/revenue_oriented_forecast_line_table_data?${params.toString()}`);
        setTableData(res.data?.table_data || {});
        setError(null);
      } catch (err) {
        console.error('Error fetching table data:', err);
        setError('Failed to load table data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateUpTo, brand, ir, sku, revenueMethod, revenueTarget, revenueGrowthRate, dsiPeriod, dsiMethod, dsiTarget, dsiChangeRate, scenario]);

  if (loading) return <Box display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box display="flex" justifyContent="center"><Typography color="error">{error}</Typography></Box>;

  // Create a flat list of rows that we can sort
  const tableRows: { year: string; metric: string; values: (MonthValue | null)[] }[] = [];
  
  Object.entries(tableData).forEach(([year, metrics]) => {
    metricsToDisplay.forEach(metricName => {
      // Skip applied_growth_rate_DSI and applied_growth_rate_revenue for 2024
      if ((metricName === 'applied_growth_rate_DSI' || metricName === 'applied_growth_rate_revenue') && year === '2024') {
        return;
      }
      
      if (metrics && metrics[metricName]) {
        const monthValues = months.map(month => metrics[metricName]?.[month] || null);
        tableRows.push({ year, metric: metricName, values: monthValues });
      }
    });
  });
  
  // Sort rows by metric first (in the order specified), then by year
  tableRows.sort((a, b) => {
    const metricOrderA = metricsToDisplay.indexOf(a.metric);
    const metricOrderB = metricsToDisplay.indexOf(b.metric);
    
    if (metricOrderA !== metricOrderB) return metricOrderA - metricOrderB;
    return a.year.localeCompare(b.year);
  });

  return (
    <TableContainer component={Paper} sx={{ height: '100%', boxShadow: 'none', overflow: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={tableStyles.headerCell}>Metric</TableCell>
            <TableCell sx={tableStyles.headerCell}>Year</TableCell>
            {months.map(month => (
              <TableCell key={month} align="right" sx={tableStyles.headerCell}>{month}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {tableRows.map(({ year, metric, values }, index) => (
            <TableRow key={`${year}-${metric}-${index}`}>
              <TableCell sx={tableStyles.cell}>{metricDisplayNames[metric] || metric}</TableCell>
              <TableCell sx={tableStyles.cell}>{year}</TableCell>
              {values.map((entry, monthIndex) => (
                <TableCell
                  key={`${year}-${metric}-${months[monthIndex]}`}
                  align="right"
                  sx={entry?.type === 'forecast' ? tableStyles.forecastCell : tableStyles.cell}
                >
                  {entry?.value != null ? formatMetricValue(metric, entry.value) : '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default RevenueForecastTable;
