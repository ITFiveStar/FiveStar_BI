import React, { useEffect, useState, useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Box, CircularProgress, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ChartContainer from './ChartContainer';
import { nivoTheme } from './nivoTheme';
import axios from 'axios';

interface BarDatum {
  id: string;
  value: number;
  [key: string]: string | number;
}

interface TooltipDetail {
  sku: string;
  gross_margin_percentage: number;
  net_profit_percentage: number;
}

interface ApiResponse {
  bar_by_gross_margin_percentage: BarDatum[];
  bar_by_net_profit_percentage: BarDatum[];
  tooltip_details: Record<string, TooltipDetail[]>;
  as_of_date: string;
}

export type ChartDisplayMode = 'top5' | 'bottom5';

interface MainComponentProfitabilityBarChartProps {
  onDisplayModeChange?: (mode: ChartDisplayMode) => void;
  displayMode?: string;
  dateUpTo?: Date | null;
}

const MainComponentProfitabilityBarChart: React.FC<MainComponentProfitabilityBarChartProps> = ({ 
  onDisplayModeChange,
  displayMode = 'month',
  dateUpTo
}) => {
  const [data, setData] = useState<BarDatum[]>([]);
  const [tooltipDetails, setTooltipDetails] = useState<Record<string, TooltipDetail[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<'gross_margin_percentage' | 'net_profit_percentage'>('gross_margin_percentage');
  const [chartDisplayMode, setChartDisplayMode] = useState<ChartDisplayMode>('top5');

  const baseBlueShades = ['#AFC8DA', '#94B4CD', '#7DA2C1', '#5C89AE', '#47709B'];
  const otherColor = '#CCCCCC';

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('mode', chartDisplayMode);
      if (displayMode) params.append('displayMode', displayMode);
      
      if (dateUpTo) {
        // Format date as YYYY-MM-DD
        const year = dateUpTo.getFullYear();
        const month = String(dateUpTo.getMonth() + 1).padStart(2, '0');
        const day = String(dateUpTo.getDate()).padStart(2, '0');
        params.append('dateUpTo', `${year}-${month}-${day}`);
      }
      
      // Add params to request
      const queryString = params.toString();
      const url = `/SKU_profitability_horizontal_bar_chart_data?${queryString}`;
      
      const res = await axios.get<ApiResponse>(url);
      setTooltipDetails(res.data.tooltip_details);
      setData(metric === 'gross_margin_percentage' 
        ? res.data.bar_by_gross_margin_percentage 
        : res.data.bar_by_net_profit_percentage);
      setError(null);
    } catch (err) {
      console.error('Error fetching bar chart data:', err);
      setError('No enough data available based on the selected filters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [chartDisplayMode, displayMode, dateUpTo]);

  useEffect(() => {
    console.log('📊 Chart Data:', data);
  }, [data]);

  const handleMetricChange = (_: any, newValue: typeof metric | null) => {
    if (newValue) {
      setMetric(newValue);
      setLoading(true);
      
      // Build query parameters for metric toggle
      const params = new URLSearchParams();
      params.append('mode', chartDisplayMode);
      if (displayMode) params.append('displayMode', displayMode);
      
      if (dateUpTo) {
        // Format date as YYYY-MM-DD
        const year = dateUpTo.getFullYear();
        const month = String(dateUpTo.getMonth() + 1).padStart(2, '0');
        const day = String(dateUpTo.getDate()).padStart(2, '0');
        params.append('dateUpTo', `${year}-${month}-${day}`);
      }
      
      // Add params to request
      const queryString = params.toString();
      const url = `/SKU_profitability_horizontal_bar_chart_data?${queryString}`;
      
      axios.get<ApiResponse>(url)
        .then(res => {
          const updated = newValue === 'gross_margin_percentage' 
            ? res.data.bar_by_gross_margin_percentage 
            : res.data.bar_by_net_profit_percentage;
          setData(updated);
        })
        .catch(err => {
          console.error('Error fetching bar chart data:', err);
          setError('No enough data available based on the selected filters.');
        })
        .finally(() => setLoading(false));
    }
  };

  const handleDisplayModeChange = (_: any, newValue: ChartDisplayMode | null) => {
    if (newValue) {
      setChartDisplayMode(newValue);
      // Notify parent component of display mode change if callback exists
      if (onDisplayModeChange) {
        onDisplayModeChange(newValue);
      }
    }
  };

  const customTooltip = ({ data }: { data: BarDatum }) => {
    const items = tooltipDetails[data.id];
    if (!items) return null;
  
    return (
      <div 
        style={{
          transform: 'translateY(30px)',
          position: 'relative',
          zIndex: 10,
          background: '#FFFFFF',
          fontSize: 12,
          borderRadius: 4,
          boxShadow: '0 1px 4px rgba(71, 112, 155, 0.25)',
          padding: '8px 12px',
          color: '#000000',
          border: '1px solid #AFC8DA',
        }}
      >
        <div style={{ marginBottom: 6 }}>
          <strong><u>{data.id}</u></strong>: {data.value.toFixed(1)}%
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginTop: 2 }}>
              {item.sku}: {(metric === 'gross_margin_percentage' 
                ? item.gross_margin_percentage 
                : item.net_profit_percentage).toFixed(1)}%
            </li>
          ))}
        </ul>
      </div>
    );
  };  

  const barColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
  
    const topComponents = data.filter(d => d.id !== 'Other');
    topComponents.forEach((d, i) => {
      colorMap[d.id] = baseBlueShades[i] ?? baseBlueShades[baseBlueShades.length - 1];
    });
  
    const othersEntry = data.find(d => d.id === 'Other');
    if (othersEntry) {
      colorMap['Other'] = otherColor;
    }
  
    console.log("🎨 Bar Colors:", colorMap);
    return colorMap;
  }, [data]);
  

  if (loading) return <ChartContainer><CircularProgress /></ChartContainer>;
  if (error) return <ChartContainer><Typography color='#999'>{error}</Typography></ChartContainer>;

  return (
    <ChartContainer>
      <Box sx={{ position: 'relative', height: '100%', width: '100%', padding: 0, m: 0 }}>
        <Box sx={{ position: 'absolute', top: 0, right: 3, zIndex: 2, display: 'flex', gap: 1 }}>
          <ToggleButtonGroup
            value={chartDisplayMode}
            exclusive
            onChange={handleDisplayModeChange}
            size="small"
            sx={{ height: 28 }}
          >
            <ToggleButton value="top5" sx={{ px: 1.5, py: 0.5, fontSize: 12 }}>
              Top 5
            </ToggleButton>
            <ToggleButton value="bottom5" sx={{ px: 1.5, py: 0.5, fontSize: 12 }}>
              Bottom 5
            </ToggleButton>
          </ToggleButtonGroup>
          
          <ToggleButtonGroup
            value={metric}
            exclusive
            onChange={handleMetricChange}
            size="small"
            sx={{ height: 28 }}
          >
            <ToggleButton value="gross_margin_percentage" sx={{ px: 1.5, py: 0.5, fontSize: 12 }}>
              Gross Margin %
            </ToggleButton>
            <ToggleButton value="net_profit_percentage" sx={{ px: 1.5, py: 0.5, fontSize: 12 }}>
              Net Profit %
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ height: '100%', width: '100%', position: 'relative', minHeight: 180 }}>
          <Box sx={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'auto' }}>
            <ResponsiveBar
              data={data}
              keys={['value']}
              indexBy="id"
              layout="horizontal"
              margin={{ top: 30, right: 10, bottom: 0, left: 160 }}
              padding={0.3}
              axisTop={null}
              axisRight={null}
              axisBottom={null}
              axisLeft={{ tickSize: 0, tickPadding: 5 }}
              enableGridX={false}
              enableGridY={false}
              enableLabel
              label={({ value }) => `${(value ?? 0).toFixed(1)}%`}
              labelTextColor={({ index }) => {
                return index === 0 ? '#999' : index === data.length - 1 ? '#FFFFFF' : '#000000';
              }}
              labelPosition="end"
              labelOffset={-40}
              tooltip={customTooltip}
              colors={({ data }) => barColors[data.id as string] || '#999'}
              theme={nivoTheme}
            />
          </Box>
        </Box>
      </Box>
    </ChartContainer>
  );
};

export default MainComponentProfitabilityBarChart;