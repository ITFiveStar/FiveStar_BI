import React, { useEffect, useState } from 'react';
import { ResponsiveLine, SliceTooltipProps } from '@nivo/line';
import { Box, CircularProgress, Typography } from '@mui/material';
import axios from 'axios';
import ChartContainer from './ChartContainer';
import { nivoTheme } from './nivoTheme';

// Add a formatter function for currency values
const formatCurrency = (value: number): string => {
  // Convert to thousands (k) format
  const valueInThousands = value / 1000;
  
  // Format with thousand separators and append 'k'
  return `$${valueInThousands.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}k`;
};

// Custom tooltip component
const CustomTooltip = ({ slice }: SliceTooltipProps) => {
  return (
    <div
      style={{
        background: 'white',
        padding: '9px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
      }}
    >
      <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
        {slice.points[0].data.x?.toString()}
      </div>
      {slice.points.map(point => (
        <div
          key={point.id}
          style={{
            color: point.serieColor,
            padding: '3px 0',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ marginRight: '10px' }}>{point.serieId}</span>
          <span style={{ fontWeight: 600 }}>
            {formatCurrency(point.data.y as number)}
          </span>
        </div>
      ))}
    </div>
  );
};

interface RevenueForecastLineChartProps {
  dateUpTo?: Date | null;
  brand?: string;
  ir?: string;
  sku?: string;
  revenueMethod: 'benchmark' | 'target_revenue' | 'flat_growth';
  revenueTarget?: string;
  revenueGrowthRate?: string;
  dsiPeriod: '30' | '60' | '90';
  dsiMethod: 'benchmark' | 'target_DSI' | 'flat_change';
  dsiTarget?: string;
  dsiChangeRate?: string;
  scenario?: string;
}

const RevenueForecastLineChart: React.FC<RevenueForecastLineChartProps> = ({
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
  scenario = '1' // Default to scenario 1
}) => {
  const [lineData, setLineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format date as YYYY-MM-DD
  const formatDateForAPI = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return '';
    // Get local date parts to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Build query params
        const params = new URLSearchParams();
        
        // Global filters
        if (dateUpTo) params.append('dateUpTo', formatDateForAPI(dateUpTo));
        if (brand) params.append('brand', brand);
        if (ir) params.append('ir', ir);
        if (sku) params.append('sku', sku);
        
        // Forecast-specific filters
        params.append('forecast_revenue_method', revenueMethod);
        params.append('DSI_period_in_days', dsiPeriod);
        params.append('forecast_DSI_method', dsiMethod);
        
        // Conditional params based on method selection
        if (revenueMethod === 'target_revenue' && revenueTarget) {
          params.append('year_end_total_revenue_target', revenueTarget);
        }
        
        if (revenueMethod === 'flat_growth' && revenueGrowthRate) {
          params.append('input_growth_rate', revenueGrowthRate);
        }
        
        if (dsiMethod === 'target_DSI' && dsiTarget) {
          params.append('year_end_DSI_target', dsiTarget);
        }
        
        if (dsiMethod === 'flat_change' && dsiChangeRate) {
          params.append('input_DSI_change_rate', dsiChangeRate);
        }
        
        // Scenario identifier
        params.append('scenario', scenario);
        
        const queryString = params.toString();
        const url = `/evaluate_strategy/revenue_oriented_forecast_line_table_data?${queryString}`;
        
        const res = await axios.get(url);
        const rawLines = res.data?.line_chart_data?.revenue || [];

        // Define ordered months array
        const orderedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // First, collect all unique months from all series
        const allMonths = new Set<string>();
        rawLines.forEach((series: any) => {
          series.data.forEach((d: any) => {
            allMonths.add(d.x);
          });
        });
        
        // Filter to only include months that exist in the data and sort them chronologically
        const existingMonths = orderedMonths.filter(month => allMonths.has(month));
        
        // Process each series
        const formatted = rawLines.map((series: any) => {
          // Create a lookup map for each month in this series
          const monthMap = new Map();
          series.data.forEach((d: any) => {
            monthMap.set(d.x, d.y);
          });
          
          // Create a new data array with consistent ordering
          const orderedData = existingMonths.map(month => ({
            x: month,
            y: monthMap.has(month) ? monthMap.get(month) : null
          }));
          
          return {
            id: series.id,
            data: orderedData
          };
        });

        setLineData(formatted);
        setError(null);
      } catch (err) {
        console.error('Error fetching revenue forecast line chart:', err);
        setError('Unable to load revenue forecast data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
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
    scenario
  ]);

  if (loading) return <ChartContainer><CircularProgress /></ChartContainer>;
  if (error) return <ChartContainer><Typography color="#999">{error}</Typography></ChartContainer>;

  return (
    <ChartContainer>
      <Box sx={{ position: 'relative', height: '100%', width: '100%', padding: 0, m: 0 }}>
        <Box sx={{ height: '100%', width: '100%', display: 'flex', position: 'relative', minHeight: 10 }}>
          <Box sx={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'auto' }}>
            <ResponsiveLine
              data={lineData}
              curve="monotoneX"
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
              margin={{ top: 10, right: 260, bottom: 30, left: 60 }}
              axisBottom={{
                format: (value) => {
                  const point = lineData.flatMap((series: any) => series.data).find((d: any) => d.x === value);
                  return point?.label || value;
                },
              }}
              axisLeft={{
                format: (value) => formatCurrency(value),
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
              }}
              colors={({ id }) => {
                // Check if the id is a string before using includes
                const idStr = String(id);
                if (idStr.includes('2025') && !idStr.includes('Forecast')) {
                  return '#66c2a5'; // 2025 Actuals
                } else if (idStr.includes('2024') && !idStr.includes('Forecast')) {
                  return '#47709B'; // 2024 Actuals
                } else if (idStr.includes('Forecast')) {
                  return '#fc8d62'; // Forecast lines
                } else {
                  return '#b3b3b3'; // All other actuals
                }
              }}
              lineWidth={2}
              pointSize={6}
              pointColor={{ theme: 'background' }}
              pointBorderWidth={2}
              pointBorderColor={{ from: 'serieColor' }}
              enableSlices="x"
              sliceTooltip={CustomTooltip}
              useMesh
              theme={nivoTheme}
              legends={[
                {
                  anchor: 'top-right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemDirection: 'left-to-right',
                  itemWidth: 100,
                  itemHeight: 14,
                  symbolSize: 8,
                  symbolShape: 'circle',
                },
              ]}
              enableGridX={false}
              enableGridY={true}
            />
          </Box>
        </Box>
      </Box>
    </ChartContainer>
  );
};

export default RevenueForecastLineChart;
