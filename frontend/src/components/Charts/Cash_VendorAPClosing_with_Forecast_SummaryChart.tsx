import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { ResponsiveLine, CustomLayerProps } from '@nivo/line';
import { ResponsiveBar, BarCustomLayerProps } from '@nivo/bar';
import axios from 'axios';
import ChartContainer from './ChartContainer';
import { nivoTheme } from './nivoTheme';

interface DataPoint {
  date: string;
  cash_cumulative: number;
  vendor_AP_closing: number;
  [key: string]: string | number; // 👈 makes it compatible with Nivo Bar
}

interface CashVendorAPChartProps {
  brand?: string;
  ir?: string;
  revenueMethod?: 'benchmark' | 'target_revenue' | 'flat_growth';
  revenueTarget?: string;
  revenueGrowthRate?: string;
  fbmShippingCostRatio?: string;
  dsiPeriod?: '30' | '60' | '90';
  dsiMethod?: 'benchmark' | 'target_DSI' | 'flat_change';
  dsiTarget?: string;
  dsiChangeRate?: string;
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

const Cash_VendorAPClosing_Chart: React.FC<CashVendorAPChartProps> = ({
  brand,
  ir,
  revenueMethod = 'benchmark',
  revenueTarget,
  revenueGrowthRate,
  fbmShippingCostRatio,
  dsiPeriod = '30',
  dsiMethod = 'benchmark',
  dsiTarget,
  dsiChangeRate,
}) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [forecastStartDate, setForecastStartDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url = '/evaluate_strategy/cashflow_AR_AP_net_add_vendor_payment_actuals_and_forecast_chart_data';
    const params = new URLSearchParams();

    if (brand) params.append('brand', brand);
    if (ir) params.append('ir', ir);
    params.append('forecast_revenue_method', revenueMethod);

    if (revenueMethod === 'target_revenue' && revenueTarget) {
      params.append('year_end_total_revenue_target', revenueTarget);
    }

    if (revenueMethod === 'flat_growth' && revenueGrowthRate) {
      params.append('input_growth_rate', revenueGrowthRate);
    }

    if (fbmShippingCostRatio) {
      params.append('FBMshipping_cost_to_revenue_ratio', fbmShippingCostRatio);
    }

    if (dsiPeriod) {
      params.append('dsi_period', dsiPeriod);
    }

    params.append('forecast_dsi_method', dsiMethod);

    if (dsiMethod === 'target_DSI' && dsiTarget) {
      params.append('target_dsi', dsiTarget);
    }

    if (dsiMethod === 'flat_change' && dsiChangeRate) {
      params.append('dsi_change_rate', dsiChangeRate);
    }

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    axios.get(url)
      .then(res => {
        if (res.data && Array.isArray(res.data.chart_data)) {
          setData(res.data.chart_data ?? []);
          setForecastStartDate(res.data.forecast_start_date);
          setError(null);
        } else {
          setError('No data available');
        }
      })
      .catch(err => {
        console.error(err);
        setError('No enough data available based on the selected filters.');
      })
      .finally(() => setLoading(false));
  }, [brand, ir, revenueMethod, revenueTarget, revenueGrowthRate, fbmShippingCostRatio, dsiPeriod, dsiMethod, dsiTarget, dsiChangeRate]);

  if (loading) return <ChartContainer><CircularProgress /></ChartContainer>;
  if (error) return <ChartContainer><Typography color="#999">{error}</Typography></ChartContainer>;
  if (!data || data.length === 0) {
    return <ChartContainer><Typography color="#999">No data available to display.</Typography></ChartContainer>;
  }

  const allValues = [
    ...data.map(d => d.cash_cumulative),
    ...data.map(d => d.vendor_AP_closing)
  ];
  const yMin = Math.floor(Math.min(...allValues, 0) * 1.1);
  const yMax = Math.ceil(Math.max(...allValues, 0) * 1.1);

  const barKeys = ['vendor_AP_closing'];
  const barColors: Record<string, string> = {
    vendor_AP_closing: '#AFC8DA'
  };

  const lineData = [
    {
      id: 'cash_cumulative',
      data: data.map(d => ({ x: d.date, y: d.cash_cumulative }))
    }
  ];

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
            r={3}
            fill={point.color}
            stroke="#fff"
            strokeWidth={1}
          />
        ))}
      </g>
    );
  };

  const forecastReferenceLineLayer = ({ xScale, innerHeight }: CustomLayerProps) => {
    if (!forecastStartDate) return null;
    const bandwidth = typeof (xScale as any).bandwidth === 'function' ? (xScale as any).bandwidth() : 0;
    const xPos = (xScale as any)(forecastStartDate) + bandwidth / 2;
    if (typeof xPos !== 'number' || isNaN(xPos)) return null;

    return (
      <g>
        <line x1={xPos} x2={xPos} y1={0} y2={innerHeight} stroke="#FF6B6B" strokeWidth={2} strokeDasharray="5,5" />
        <text x={xPos + 10} y={10} fontSize={12} fontWeight="bold" fill="#FF6B6B">➤ Forecast</text>
      </g>
    );
  };

  const LineSliceTooltip = ({ slice }: { slice: any }) => {
    const date = slice.points[0]?.data?.x ?? 'N/A';
    const cash = slice.points.find((pt: any) => pt.serieId === 'cash_cumulative')?.data?.y ?? 'N/A';
    return (
      <div style={{
        background: '#FFF', fontSize: 12, borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        padding: '8px 12px', color: '#000', border: '1px solid #AFC8DA', whiteSpace: 'nowrap'
      }}>
        <div style={{ fontWeight: 600 }}>Cumulative as of: {date}</div>
        <hr style={{ margin: '6px 0', border: 'none', borderTop: '1px solid #AFC8DA' }} />
        <div>Cash: {formatTooltipValue(cash)}</div>
      </div>
    );
  };

  const inlineLegendLayer = ({ series, xScale }: CustomLayerProps) => {
    const bandwidth = typeof (xScale as any).bandwidth === 'function'
      ? (xScale as any).bandwidth()
      : 0;
  
    // Mapping of series ids to custom labels
    const legendLabels: Record<string, string> = {
      cash_cumulative: 'Cumulative Cash'
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

  const customXAxisAtZero = ({ yScale, width }: BarCustomLayerProps<DataPoint>) => {
    const y = (yScale as any)(0);
    return (
      <line x1={0} x2={width} y1={y} y2={y} stroke="#AFC8DA" strokeWidth={1} />
    );
  };

  return (
    <ChartContainer>
      <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
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
            theme={nivoTheme}
            curve="monotoneX"
            layers={[
              'grid',
              'markers',
              'axes',
              shiftedLineLayer,
              shiftedPointsLayer,
              forecastReferenceLineLayer,
              inlineLegendLayer,
              'slices'
            ]}
            sliceTooltip={LineSliceTooltip}
            useMesh={true}
            enablePoints={true}
            enableSlices="x"
          />
        </Box>

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
                itemWidth: 220,
                itemHeight: 20,
                itemDirection: 'left-to-right',
                symbolSize: 12,
                data: [
                  { id: 'vendor_AP_closing', label: 'Payment to Vendor', color: '#AFC8DA' }
                ]
              }
            ]}
            theme={nivoTheme}
            valueFormat={formatValue}
            enableLabel={true}
            labelSkipHeight={0}
            labelSkipWidth={0}
            label={({ id, data }) => {
              const rawValue = (data as Record<string, any>)[id as string];
              return rawValue === 0 || rawValue === undefined || rawValue === null ? '' : formatValue(rawValue);
            }}
            labelTextColor="black"
          />
        </Box>
      </Box>
    </ChartContainer>
  );
};

export default Cash_VendorAPClosing_Chart;
