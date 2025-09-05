import React, { useEffect, useState } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { Box, CircularProgress, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ChartContainer from './ChartContainer';
import { nivoTheme } from './nivoTheme';
import axios from 'axios';

interface MainComponentSalesPieChartProps {
  displayMode?: string;
  dateUpTo?: Date | null;
}

interface PieDatum {
  id: string;
  value: number;
}

interface TooltipDetail {
  sku: string;
  revenue: number;
  quantity: number;
}

interface ApiResponse {
  pie_by_revenue: PieDatum[];
  pie_by_quantity: PieDatum[];
  tooltip_details: Record<string, TooltipDetail[]>;
  as_of_date: string;
}

const MainComponentSalesPieChart: React.FC<MainComponentSalesPieChartProps> = ({ 
  displayMode = 'month',
  dateUpTo
}) => {
  const [data, setData] = useState<PieDatum[]>([]);
  const [tooltipDetails, setTooltipDetails] = useState<Record<string, TooltipDetail[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<'revenue' | 'quantity'>('revenue');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
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
      const url = queryString 
        ? `/SKU_sales_performance_revenue_quantity_pie_chart_data?${queryString}` 
        : '/SKU_sales_performance_revenue_quantity_pie_chart_data';
      
      const res = await axios.get<ApiResponse>(url);
      setTooltipDetails(res.data.tooltip_details);
      setData(metric === 'revenue' ? res.data.pie_by_revenue : res.data.pie_by_quantity);
      setError(null);
    } catch (err) {
      console.error('Error fetching pie chart data:', err);
      setError('No enough data available based on the selected filters.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [displayMode, dateUpTo]); // Re-fetch when filters change

  const handleMetricChange = (_: any, newValue: 'revenue' | 'quantity' | null) => {
    if (newValue) {
      setMetric(newValue);
      setLoading(true);
      
      // Build query parameters for metric toggle
      const params = new URLSearchParams();
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
      const url = queryString 
        ? `/SKU_sales_performance_revenue_quantity_pie_chart_data?${queryString}` 
        : '/SKU_sales_performance_revenue_quantity_pie_chart_data';
      
      axios.get<ApiResponse>(url)
        .then(res => {
          const updated = newValue === 'revenue' ? res.data.pie_by_revenue : res.data.pie_by_quantity;
          setData(updated);
        })
        .catch(err => {
          console.error('Error fetching pie chart data:', err);
          setError('No enough data available based on the selected filters.');
        })
        .finally(() => setLoading(false));
    }
  };

  const baseBlueShades = [
    '#47709B', // deep
    '#5C89AE',
    '#7DA2C1', // mid
    '#94B4CD',
    '#AFC8DA'  // light
  ];
  const otherColor = '#CCCCCC';

  const pieIndexMap: Record<string, number> = {};
  data.forEach((d, i) => {
    pieIndexMap[d.id] = i;
  });

  const customTooltip = ({ datum }: { datum: any }) => {
    const items = tooltipDetails[datum.id];
    if (!items) return null;
  
    const total = items.reduce(
      (sum, x) => sum + (metric === 'revenue' ? x.revenue : x.quantity),
      0
    );
  
    const formattedTotal =
      metric === 'revenue'
        ? `$${Math.round(total).toLocaleString()}`
        : Math.round(total).toLocaleString();
  
    return (
      <div
        style={{
          background: '#FFFFFF',
          fontSize: 12,
          borderRadius: 4,
          boxShadow: '0 1px 4px rgba(71, 112, 155, 0.25)',
          padding: '8px 12px',
          color: '#000000',
          border: '1px solid #AFC8DA'
        }}
      >
        <div style={{ marginBottom: 6 }}>
          <strong><u>{datum.id}</u></strong>: {formattedTotal}
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item, idx) => {
            const val = metric === 'revenue' ? item.revenue : item.quantity;
            const percent = total > 0 ? Math.round((val / total) * 100) : 0;
            const formattedVal =
              metric === 'revenue'
                ? `$${Math.round(val).toLocaleString()}`
                : Math.round(val).toLocaleString();
  
            return (
              <li key={idx} style={{ marginTop: 2 }}>
                {item.sku}: {formattedVal} ({percent}%)
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  if (loading) return <ChartContainer><CircularProgress /></ChartContainer>;
  if (error) return <ChartContainer><Typography color='#999'>{error}</Typography></ChartContainer>;

  const pieColors: Record<string, string> = {};
  data.forEach((d, i) => {
    pieColors[d.id] = d.id === 'Other'
        ? otherColor
        : baseBlueShades[i % baseBlueShades.length];
    });

  return (
    <ChartContainer>
        <Box sx={{ position: 'relative', height: '100%', width: '100%', padding: 0, m: 0 }}>
            <Box sx={{ position: 'absolute', top: 0, right: 3, zIndex: 2 }}>
              <ToggleButtonGroup
                  value={metric}
                  exclusive
                  onChange={handleMetricChange}
                  size="small"
                  sx={{ height: 28 }}
              >
                  <ToggleButton value="revenue" sx={{ px: 1.5, py: 0.5, fontSize: 12 }}>
                  Revenue
                  </ToggleButton>
                  <ToggleButton value="quantity" sx={{ px: 1.5, py: 0.5, fontSize: 12 }}>
                  Quantity
                  </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ height: '100%', width: '100%', display: 'flex', position: 'relative', minHeight: 140}}>
                <Box sx={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'auto' }}>
                    <ResponsivePie
                        data={data}
                        margin={{ top: 12, right: 0, bottom: 12, left: 0 }}
                        fit={true}
                        innerRadius={0.5}
                        padAngle={2}
                        cornerRadius={0}
                        activeOuterRadiusOffset={10}
                        borderWidth={1}
                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                        colors={(d) => pieColors[d.id as string] || '#999'}
                        enableArcLinkLabels={false}
                        legends={[
                            {
                              anchor: 'bottom-left',
                              direction: 'column',
                              justify: false,
                              translateX: 40,
                              itemWidth: 100,
                              itemHeight: 18,
                              itemsSpacing: 4,
                              symbolSize: 12,
                              symbolShape: 'circle',
                              itemTextColor: '#000'
                            },
                          ]}
                          
                        valueFormat={(value) =>
                            metric === 'revenue'
                              ? `$${Math.round(value / 1000).toLocaleString()}k`
                              : Math.round(value).toLocaleString()
                          }
                        arcLabelsTextColor={(datum) => {
                            if (datum.id === 'Other') return '#999';
                            return pieIndexMap[datum.id] === 0 ? '#FFFFFF' : '#000000';
                          }}
                        tooltip={customTooltip}
                        theme={nivoTheme}
                    />

                    {/* Total in center of donut */}
                    <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none'
                    }}
                    >
                    <Typography sx={{ fontWeight: 600, fontSize: 12, color: '#333' }}>
                        {metric === 'revenue'
                            ? 'Sales Revenue'
                            : 'Sales Quantity'}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#47709B' }}>
                        {metric === 'revenue'
                            ? `$${Math.round(data.reduce((sum, d) => sum + d.value, 0)).toLocaleString()}`
                            : Math.round(data.reduce((sum, d) => sum + d.value, 0)).toLocaleString()}
                    </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    </ChartContainer>
  );
};

export default MainComponentSalesPieChart;