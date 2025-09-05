import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { ResponsiveBar, BarCustomLayerProps } from '@nivo/bar';
import { ResponsiveLine, CustomLayerProps } from '@nivo/line';
import ChartContainer from './ChartContainer';
import axios from 'axios';
import { nivoTheme } from './nivoTheme';

interface DataPoint {
    date: string;
    AR_cumulative: number;
    AP_cumulative: number;
    AR_closing: number;
    AP_closing: number;
    [key: string]: string | number; // 👈 Add this line
  }  

interface AR_AP_StatementComboChartProps {
  dateUpTo?: Date | null;
  brand?: string;
  ir?: string;
  sku?: string;
}

const formatValue = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return String(value);

  const formatted = Math.round(Math.abs(num / 1000)).toLocaleString();

  return num < 0 ? `$(${formatted}k)` : `$${formatted}k`;
};

const formatTooltipValue = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
  
    if (isNaN(num)) return String(value);
  
    const formatted = Math.round(Math.abs(num)).toLocaleString();
    return num < 0 ? `$(${formatted})` : `$${formatted}`;
};

const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: '2-digit',
      month: 'short',
      day: '2-digit'
    }).replace(/,/g, '-'); // e.g., Apr-03-25
};

const AR_AP_StatementComboChart: React.FC<AR_AP_StatementComboChartProps> = ({ dateUpTo, brand, ir, sku }) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Build URL with params
    let url = '/summary_AR_AP_and_statements_closing_chart_data';
    const params = new URLSearchParams();
    
    if (dateUpTo) {
      const year = dateUpTo.getFullYear();
      const month = String(dateUpTo.getMonth() + 1).padStart(2, '0');
      const day = String(dateUpTo.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      params.append('dateUpTo', formattedDate);
    }
    
    if (brand) params.append('brand', brand);
    if (ir) params.append('ir', ir);
    if (sku) params.append('sku', sku);
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    axios.get(url)
      .then(res => {
        setData(res.data.chart_data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching chart data:', err);
        setError('No enough data available based on the selected filters.');
      })
      .finally(() => setLoading(false));
  }, [dateUpTo, brand, ir, sku]);

  if (loading) return <ChartContainer><CircularProgress /></ChartContainer>;
  if (error) return <ChartContainer><Typography color='#999'>{error}</Typography></ChartContainer>;

  const allValues = [
    ...data.map(d => d.AR_cumulative),
    ...data.map(d => d.AP_cumulative),
    ...data.map(d => d.AR_closing),
    ...data.map(d => d.AP_closing),
  ];

  const yMin = Math.floor(Math.min(...allValues, 0) * 1.1); // ensure room below 0
  const yMax = Math.ceil(Math.max(...allValues, 0) * 1.1);  // ensure room above

  const barKeys = ['AR_closing', 'AP_closing'];
  const barColors: Record<string, string> = {
    AR_closing: '#47709B',
    AP_closing: '#AFC8DA'
  };

//   const lineColors: Record<string, string> = {
//     AR_cumulative: '#47709B',
//     AP_cumulative: '#AFC8DA',
//   };  

  const lineData = [
    {
      id: 'AR_cumulative',
      data: data.map(d => ({ x: d.date, y: d.AR_cumulative }))
    },
    {
      id: 'AP_cumulative',
      data: data.map(d => ({ x: d.date, y: d.AP_cumulative }))
    }
  ];

  // Layer to shift the line to match the center of the bar
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

  const shiftedPointsLayer = ({ points, xScale }: CustomLayerProps) => {
    const bandwidth = typeof (xScale as any).bandwidth === 'function'
      ? (xScale as any).bandwidth()
      : 0;

    return (
      <g transform={`translate(${bandwidth / 2}, 0)`}>
        {points.map(point => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={5}
            fill={point.color}
            stroke="#fff"
            strokeWidth={1}
          />
        ))}
      </g>
    );
  };

  const LineSliceTooltip = ({ slice }: { slice: any }) => {
    const date = slice.points[0]?.data?.x ?? 'N/A';
    const AR = slice.points.find((pt: any) => pt.serieId === 'AR_cumulative')?.data?.y ?? 'N/A';
    const AP = slice.points.find((pt: any) => pt.serieId === 'AP_cumulative')?.data?.y ?? 'N/A';
  
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
          whiteSpace: 'nowrap'
        }}
      >
        <div style={{ fontWeight: 600 }}>Cumulative as of Date: {date}</div>
        <hr style={{ margin: '6px 0', border: 'none', borderTop: '1px solid #AFC8DA' }} />
        <div>AR: {formatTooltipValue(AR)}</div>
        <div>AP: {formatTooltipValue(AP)}</div>
      </div>
    );
  };

  const inlineLegendLayer = ({ series, xScale }: CustomLayerProps) => {
    const bandwidth = typeof (xScale as any).bandwidth === 'function'
      ? (xScale as any).bandwidth()
      : 0;
  
    // Mapping of series ids to custom labels
    const legendLabels: Record<string, string> = {
      AR_cumulative: 'Cumulative AR',
      AP_cumulative: 'Cumulative AP (Amazon & FBM Shipping)',
    };
  
    return (
      <g transform={`translate(${bandwidth / 2}, 0)`}>
        {series.map(({ id, data, color }, index) => {
          const firstPoint = data[0];
          const yOffset = index * 10;

          return (
            <text
              key={id}
              x={firstPoint.position.x - 40}
              y={firstPoint.position.y + 30 - yOffset}
              fill={color}
              fontSize={12}
              fontWeight={700}
              textAnchor="start"
            >
              {legendLabels[id] || id}
            </text>
          );
        })}
      </g>
    );
  };

  const customXAxisAtZero = ({
    yScale,
    width,
  }: BarCustomLayerProps<DataPoint>) => {
    const y = (yScale as any)(0); // y-position for 0
    return (
      <line
        x1={0}
        x2={width}
        y1={y}
        y2={y}
        stroke="#AFC8DA"
        strokeWidth={1}
      />
    );
  };

//   const monthStartDates = data
//   .filter(d => new Date(d.date).getDate() === 1)
//   .map(d => d.date);
//   const customXAxisAtZero = ({
//     xScale,
//     yScale,
//     width,
//     bars,
//   }: BarCustomLayerProps<DataPoint>) => {
//     const y = (yScale as any)(0);
//     const scale = xScale as any;
  
//     return (
//       <g>
//         {/* Draw horizontal line at y = 0 */}
//         <line
//           x1={0}
//           x2={width}
//           y1={y}
//           y2={y}
//           stroke="#333"
//           strokeWidth={1}
//         />
  
//         {/* Tick marks + date labels */}
//         {monthStartDates.map((tickValue) => {
//           const x = scale(tickValue) + (scale.bandwidth ? scale.bandwidth() / 2 : 0);
  
//           return (
//             <g key={tickValue} transform={`translate(${x}, ${y})`}>
//               <line y2={6} stroke="#333" strokeWidth={1} />
//               <text
//                 y={18}
//                 textAnchor="middle"
//                 dominantBaseline="hanging"
//                 style={{ fontSize: 11, fill: '#333' }}
//               >
//                 {formatDateLabel(tickValue)}
//               </text>
//             </g>
//           );
//         })}
//       </g>
//     );
//   };

  return (
    <ChartContainer>
      <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>

        {/* Lines */}
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <ResponsiveLine
            data={lineData}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            axisBottom={null}
            axisLeft={null}
            axisRight={null}
            xScale={{ type: 'band', round: true }}
            yScale={{ type: 'linear', min: yMin, max: yMax, stacked: false }}
            enableGridX={false}
            enableGridY={false}
            colors={{ scheme: 'set2' }}
            // colors={({ id }) => lineColors[id as string]}
            theme={nivoTheme}
            curve="monotoneX"
            layers={[
              'grid',
              'markers',
              'axes',
              shiftedLineLayer,
              shiftedPointsLayer,
              inlineLegendLayer,
              'slices'
            ]}
            sliceTooltip={LineSliceTooltip}
            useMesh={true}
            enablePoints={true}
            enableSlices="x" 
          />
        </Box>

        {/* Bars */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <ResponsiveBar
            data={data}
            keys={barKeys}
            indexBy="date"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            padding={0}
            axisBottom={null}
            axisLeft={null}
            axisRight={null}
            enableGridX={false}
            enableGridY={false}
            valueScale={{ type: 'linear', min: yMin, max: yMax }}
            colors={({ id }) => barColors[id as string]}
            layers={['grid', 'axes', 'bars', customXAxisAtZero, 'markers', 'legends']}
            legends={[
                {
                  dataFrom: 'keys',
                  anchor: 'top-left',
                  direction: 'column',
                  justify: false,
                  translateX: 0,
                  translateY: 10,
                  itemsSpacing: 8,
                  itemWidth: 350,
                  itemHeight: 20,
                  itemDirection: 'left-to-right',
                  symbolSize: 12,
                  data: [
                    { id: 'AR_closing', label: 'Closed AR from Statement Deposits', color: '#47709B' },
                    { id: 'AP_closing', label: 'Closed AP from Statement Deposits and FBM Shipping Payments', color: '#AFC8DA' }
                  ]
                }
              ]}
            theme={{
                ...nivoTheme,
                labels: {
                  text: {
                    fontSize: 14,
                    fontWeight: 700
                  }
                }
              }}
            valueFormat={formatValue}
            enableLabel={true}                 
            labelSkipHeight={0}               
            labelSkipWidth={0}
            label={bar => {
                const key = bar.id as keyof DataPoint;
                const rawValue = (bar.data as Record<string, any>)[key];
                if (rawValue === 0 || rawValue === undefined || rawValue === null) {
                  return '';
                }
                return formatValue(rawValue);
              }}
            labelTextColor={bar => {
                const key = bar.key;
                const value = (bar.data as Record<string, any>)[key];
                return value === '' ? 'transparent' : 'black';
              }}    
          />
        </Box>
      </Box>
    </ChartContainer>
  );
};

export default AR_AP_StatementComboChart;
