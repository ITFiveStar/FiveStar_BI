import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine, CustomLayerProps } from '@nivo/line';
import axios from 'axios';
import ChartContainer from './ChartContainer';
import { nivoTheme } from './nivoTheme';

interface FilterProps {
  brand?: string;
  ir?: string;
  sku?: string;
  displayMode?: string;
  dateUpTo?: Date | null;
  fullExpenseItem: string;
}

interface BackendDataPoint {
  period: string;
  total_revenue?: number;
  [key: string]: string | number | undefined;
}

const formatDollar = (val: number | string | undefined | null) => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (!num || isNaN(num)) return '$0';
  return `$${Math.round(num).toLocaleString()}`;
};

const formatPercentage = (numerator: number, denominator: number): string => {
  if (!denominator || isNaN(numerator) || isNaN(denominator)) return '0.0% of revenue';
  return `${((numerator / denominator) * 100).toFixed(1)}% of revenue`;
};

const prettyMetricNameMap: Record<string, string> = {
  commission: 'Commission',
  advertisements_sales: 'Advertisement (Sales)',
  advertisements_non_sales: 'Advertisement (Non-Sales)',
  promotions: 'Promotions',
  FBA_inbound_transportation_fee: 'FBA Inbound Transportation Fee',
  FBA_fulfillment_fee: 'FBA Fulfillment Fee',
  FBA_storage_fee: 'Storage Fee',
  FBM_fees: 'FBM Fees',
  FBM_shipping: 'FBM Shipping',
  sales_tax_service_fee: 'Sales Tax Service Fee',
  digital_services_fee: 'Digital Services Fee',
  subscription_fee: 'Subscription Fee',
  marketplace_facilitator_tax: 'Marketplace Facilitator Tax',
  revenue_chargebacks: 'Chargebacks',
  returns_shipping_gift_wrap: 'Returns Shipping & Gift Wrap Revenue Reversal',
  returns_tax: 'Returns Tax Reversal',
  returns_refund_commission: 'Returns Refund Commission',
};

const OperatingExpenseDetailedItems: React.FC<FilterProps> = ({ brand, ir, sku, displayMode = 'month', dateUpTo, fullExpenseItem }) => {
  const [data, setData] = useState<BackendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (brand) params.append('brand', brand);
        if (ir) params.append('ir', ir);
        if (sku) params.append('sku', sku);
        if (displayMode) params.append('displayMode', displayMode);
        if (fullExpenseItem) params.append('fullExpenseItem', fullExpenseItem);
        if (dateUpTo) {
          const formatted = dateUpTo.toISOString().split('T')[0];
          params.append('dateUpTo', formatted);
        }

        const res = await axios.get(`/operating_expenses_items_breakdown_trend_chart?${params.toString()}`);
        setData(res.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('No data available for the selected filters.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [brand, ir, sku, displayMode, dateUpTo, fullExpenseItem]);

  if (loading) return <ChartContainer><CircularProgress /></ChartContainer>;
  if (error) return <ChartContainer><Typography color="text.secondary">{error}</Typography></ChartContainer>;

  const barKeys = Object.keys(data[0] || {}).filter(
    key =>
      key !== 'period' &&
      key !== 'total_revenue' &&
      !key.includes('%') &&
      !key.includes('operating_expenses')
  );

  const totalBarKey = Object.keys(data[0] || {}).find(k => k.includes('operating_expenses'));
  const lineKey = Object.keys(data[0] || {}).find(k => k.includes('%'));

  const barColors: Record<string, string> = Object.fromEntries(
    barKeys.map((k, i) => [k, ['#7DA2C1', '#AFC8DA', '#BACBD8', '#C9DCE9'][i % 4]])
  );

  const yAxisMax = Math.max(...data.map(d => barKeys.reduce((acc, k) => acc + (Number(d[k]) || 0), 0))) * 1.6;

  const revenueTotalLayer = ({ bars }: any) => {
    return (
      <g>
        {bars
          .filter((bar: any) => bar.data.id === barKeys[barKeys.length - 1])
          .map((bar: any) => {
            const total = bar.data.data[totalBarKey || ''];
            return (
              <text
                key={`label-${bar.indexValue}`}
                x={bar.x + bar.width / 2}
                y={bar.y - 10}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={700}
                fill="#000"
              >
                {formatDollar(total)}
              </text>
            );
          })}
      </g>
    );
  };

  const lineData = lineKey
    ? [{
        id: lineKey,
        data: data.map(d => ({ x: d.period, y: d[lineKey] }))
      }]
    : [];

  const shiftedLineLayer = ({ lineGenerator, series, xScale }: CustomLayerProps) => {
    const bw = typeof (xScale as any).bandwidth === 'function' ? (xScale as any).bandwidth() : 0;
    return (
      <g transform={`translate(${bw / 2}, 0)`}>
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
    const bw = typeof (xScale as any).bandwidth === 'function' ? (xScale as any).bandwidth() : 0;
    return (
      <g transform={`translate(${bw / 2}, 0)`}>
        {points.map(point => (
          <g key={point.id}>
            <circle cx={point.x} cy={point.y} r={6} fill={point.color} stroke="#fff" strokeWidth={1} />
            <text
              x={point.x}
              y={point.y + 20}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#333"
              fontSize={12}
              fontWeight={600}
            >
              {typeof point.data.y === 'number' ? `${point.data.y.toFixed(1)}%` : `${point.data.y}%`}
            </text>
          </g>
        ))}
      </g>
    );
  };

  return (
    <ChartContainer>
      <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
        {/* Bar Chart */}
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <ResponsiveBar
            data={data as any}
            keys={barKeys}
            indexBy="period"
            valueScale={{ type: 'linear', max: yAxisMax }}
            margin={{ top: 40, right: 0, bottom: 50, left: 0 }}
            padding={0.3}
            colors={({ id }) => barColors[id as string]}
            axisBottom={{
              legendOffset: 40,
              legendPosition: 'middle',
            }}
            axisLeft={null}
            axisRight={null}
            enableGridX={false}
            enableGridY={false}
            layers={['grid', 'axes', 'bars', 'markers', 'legends', revenueTotalLayer]}
            theme={nivoTheme}
            valueFormat={formatDollar}
            labelTextColor={(bar) => '#000'}
            labelSkipHeight={12}
            labelSkipWidth={40}
            tooltip={({ id, value, indexValue, data }) => {
              const prettyName = prettyMetricNameMap[id as string] || id;
              const val = Number(value || 0);
              const revenue = Number(data['total_revenue'] || 0);
              return (
                <div style={{
                  background: '#fff', padding: '8px 12px', fontSize: 12,
                  border: '1px solid #ccc', borderRadius: 4, maxWidth: 220, whiteSpace: 'normal'
                }}>
                  <strong>{prettyName}</strong><br />
                  {formatDollar(val)}<br />
                  <span>{formatPercentage(val, revenue)}</span>
                </div>
              );
            }}
          />
        </Box>

        {/* Line Chart Overlay */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <ResponsiveLine
            data={lineData}
            xScale={{ type: 'band', round: true }}
            yScale={{ type: 'linear', min: -20, max: 'auto', stacked: false }}
            margin={{ top: 40, right: 0, bottom: 50, left: 0 }}
            axisLeft={null}
            axisBottom={null}
            enableGridX={false}
            enableGridY={false}
            colors={{ scheme: 'set2' }}
            layers={['grid', 'axes', shiftedLineLayer, shiftedPointsLayer, 'markers', 'slices']}
            enablePoints={true}
            useMesh
            curve="monotoneX"
            theme={nivoTheme}
            enableSlices="x"
          />
        </Box>
      </Box>
    </ChartContainer>
  );
};

export default OperatingExpenseDetailedItems;
