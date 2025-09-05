import React, { useState, useEffect } from 'react';
import { ResponsiveLine, CustomLayerProps } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';
import { Box, Typography, CircularProgress } from '@mui/material';
import { nivoTheme } from './nivoTheme';
import ChartContainer from './ChartContainer';
import axios from 'axios';

interface FilterProps {
  brand?: string;
  ir?: string;
  sku?: string;
  displayMode?: string;
  dateUpTo?: Date | null;
}

interface BackendDataPoint {
  month: string;
  [key: string]: string | number;
}

const LineTooltip = ({ point }: { point: any }) => (
  <div style={{ background: '#fff', padding: 8, border: '1px solid #ccc' }}>
    <strong>{String(point.serieId)} ({String(point.data.x)}):</strong> {String(point.data.yFormatted)}%
  </div>
);

const FinancialPerformanceSummaryChart: React.FC<FilterProps> = ({ 
  brand, 
  ir, 
  sku, 
  displayMode = 'month',
  dateUpTo 
}) => {
  const [data, setData] = useState<BackendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        if (brand) params.append('brand', brand);
        if (ir) params.append('ir', ir);
        if (sku) params.append('sku', sku);
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
          ? `/summary_revenue_gross_margin_net_profit_chart_data?${queryString}` 
          : '/summary_revenue_gross_margin_net_profit_chart_data';
        
        const res = await axios.get(url);
        setData(res.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('No enough data available based on the selected filters.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [brand, ir, sku, displayMode, dateUpTo]); // Re-fetch when filters change

  if (loading) return <ChartContainer><CircularProgress /></ChartContainer>;
  if (error) return <ChartContainer><Typography color='#999'>{error}</Typography></ChartContainer>;

  // 1. Bar chart keys
  const barKeys = ['Net Profit', 'Operating Expenses', 'COGS'];

  // 2. Colors for bars
  const barColors: Record<string, string> = {
    'Net Profit': '#47709B',
    'Operating Expenses': '#7DA2C1',
    'COGS': '#AFC8DA'
  };

  // 3. Bar y-axis range
  const maxStackedValue = Math.max(
    ...data.map(d =>
      barKeys.reduce((sum, key) => sum + (typeof d[key] === 'number' ? d[key] as number : 0), 0)
    )
  );
  const yAxisMax = maxStackedValue * 2.2;

  // 4. Format for bar chart label numbers
  const formatKValue = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '$0k';
  
    const num = typeof value === 'string' ? parseFloat(value) : value;
  
    if (isNaN(num)) return '$0k';  // Stronger fallback
  
    const rounded = Math.round(num / 1000);
    return `$${rounded.toLocaleString()}k`;
  };

  // 5. Revenue total as above label of the bar chart
  const revenueTotalLayer = ({ bars }: any) => {
    return (
      <g>
        {bars
          .filter((bar: any) => bar.data.id === 'COGS') // One label per month
          .map((bar: any) => {
            const rawRevenue = bar.data.data?.revenue;
            const formatted = formatKValue(rawRevenue);
  
            return (
              <text
                key={`revenue-label-${bar.indexValue}`}
                x={bar.x + bar.width / 2}
                y={bar.y - 10}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={700}
                fill="#000"
              >
                {formatted}
              </text>
            );
          })}
      </g>
    );
  };  

  // 6. Transform for line chart data
  const lineData = [
    {
      id: 'Gross Margin %',
      data: data.map(d => ({ x: d.month, y: d['Gross Margin %'] }))
    },
    {
      id: 'Net Profit %',
      data: data.map(d => ({ x: d.month, y: d['Net Profit %'] }))
    }
  ];

  // 7. Shift line 
  const shiftedLineLayer = ({ lineGenerator, series, xScale }: CustomLayerProps) => {
    const bandwidth = typeof (xScale as any).bandwidth === 'function'
      ? (xScale as any).bandwidth()
      : 0;
  
    return (
      <g transform={`translate(${bandwidth / 2}, 0)`}>
        {series.map(({ id, data, color }) => (
          <path
            key={id}
            d={lineGenerator(data.map(d => ({ x: d.position.x, y: d.position.y }))) ?? ''}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
        ))}
      </g>
    );
  };

  // 8. Shift dots for the line
  const shiftedPointsLayer = ({ points, xScale }: CustomLayerProps) => {
    const bandwidth =
      typeof (xScale as any).bandwidth === 'function'
        ? (xScale as any).bandwidth()
        : 0;
  
    return (
      <g transform={`translate(${bandwidth / 2}, 0)`}>
        {points.map(point => (
          <g key={point.id}>
            {/* Dot */}
            <circle
              cx={point.x}
              cy={point.y}
              r={6}
              fill={point.color}
              stroke="#fff"
              strokeWidth={1}
            />
            {/* Label */}
            <text
              x={point.x}
              y={point.y + 20} // Position label above the dot
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fill: '#333',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              {typeof point.data.y === 'number'
                ? `${point.data.y.toFixed(1)}%`
                : `${point.data.y}%`}
            </text>
          </g>
        ))}
      </g>
    );
  };
  
  // 9. Inline legend
  const inlineLegendLayer = ({ series, xScale }: CustomLayerProps) => {
    const bandwidth =
      typeof (xScale as any).bandwidth === 'function'
        ? (xScale as any).bandwidth()
        : 0;
  
    const baseX = series[0]?.data[0]?.position.x ?? 0;
    const baseY = series[0]?.data[0]?.position.y ?? 0;
  
    return (
      <g transform={`translate(${bandwidth / 2}, 0)`}>
        {series.map(({ id, data, color }, index) => {
          const firstPoint = data[0];
          const yOffset = index * 65; // 65px vertical spacing between legends
  
          return (
            <text
              key={id}
              x={firstPoint.position.x - 40}
              y={firstPoint.position.y - 20 + yOffset}
              fill={color}
              fontSize={12}
              fontWeight={700}
              textAnchor="start"
            >
              {id}
            </text>
          );
        })}
      </g>
    );
  };
    

  return (
    <ChartContainer>
      <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
        {/* Bar chart */}
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <ResponsiveBar
            data={data}
            keys={barKeys}
            indexBy="month"
            valueScale={{ type: 'linear', max: yAxisMax }}
            margin={{ top: 40, right: 0, bottom: 50, left: 0 }}
            padding={0.3}
            colors={({ id }) => barColors[id as string]}
            axisBottom={{
              // tickRotation: -45,
              // legend: 'Month',
              legendOffset: 40,
              legendPosition: 'middle'
            }}
            axisLeft={null}
            axisRight={null}
            enableGridX={false}
            enableGridY={false}
            layers={['grid', 'axes', 'bars', 'markers', 'legends', revenueTotalLayer]}
            theme={nivoTheme}
            valueFormat={formatKValue}
            labelTextColor={(bar) => {
              return bar.data.id === 'Net Profit' ? '#FFFFFF' : 'black';
            }}
            labelSkipHeight={12}
            labelSkipWidth={40}
            tooltip={({ id, value, indexValue }) => {
              const rounded = Math.round(value);
              const formatted = isNaN(rounded) ? value : `$${rounded.toLocaleString()}`;
              return (
                <div
                  style={{
                    background: '#FFFFFF',
                    fontSize: 12,
                    borderRadius: 4,
                    boxShadow: '0 1px 4px rgba(71, 112, 155, 0.25)',
                    padding: '8px 12px',
                    color: '#000000',
                    border: '1px solid #AFC8DA',
                    // whiteSpace: 'nowrap',
                    maxWidth: 140,                     
                    overflow: 'hidden',
                    // textOverflow: 'ellipsis',
                    pointerEvents: 'auto',             
                    transform: 'translateX(-10%)'
                  }}
                >
                  <strong>{id} ({indexValue}):</strong> {formatted}
                </div>
              );
            }}
          />
        </Box>

        {/* Line chart */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <ResponsiveLine
            data={lineData}
            xScale={{ type: 'band', round: true }}
            yScale={{ type: 'linear', min: -80, max: 'auto', stacked: false }}
            layers={[
              'grid',
              'markers',
              'axes',
              shiftedLineLayer,
              shiftedPointsLayer,
              inlineLegendLayer, 
              'slices'
            ]}
            margin={{ top: 40, right: 0, bottom: 50, left: 0 }}
            axisLeft={null}
            axisRight={null}
            axisBottom={null}
            colors={{ scheme: 'set2' }}
            enablePoints={true}
            pointSize={8}
            pointBorderColor={{ from: 'serieColor' }}
            pointBorderWidth={2}
            useMesh
            curve="monotoneX"
            enableGridX={false}
            enableGridY={false}
            theme={nivoTheme}
            enableSlices="x"
            tooltip={LineTooltip}
          />
        </Box>
      </Box>
    </ChartContainer>
  );
};

export default FinancialPerformanceSummaryChart;