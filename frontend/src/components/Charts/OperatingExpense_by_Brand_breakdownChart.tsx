import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine, CustomLayerProps } from '@nivo/line';
import { Box, CircularProgress, Typography } from '@mui/material';
import ChartContainer from './ChartContainer';
import { nivoTheme } from './nivoTheme';

interface FilterProps {
  brand?: string;
  ir?: string;
  sku?: string;
  displayMode?: string;
  dateUpTo?: Date | null;
}

interface BackendDataPoint {
  brand: string;
  period: string;
  [key: string]: string | number;
}

const OperatingExpenseBreakdownByBrand: React.FC<FilterProps> = ({
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
        const params = new URLSearchParams();
        if (brand) params.append('brand', brand);
        if (ir) params.append('ir', ir);
        if (sku) params.append('sku', sku);
        if (displayMode) params.append('displayMode', displayMode);
        if (dateUpTo) {
          const y = dateUpTo.getFullYear();
          const m = String(dateUpTo.getMonth() + 1).padStart(2, '0');
          const d = String(dateUpTo.getDate()).padStart(2, '0');
          params.append('dateUpTo', `${y}-${m}-${d}`);
        }
        const url = `/operating_expenses_details_trend_chart_by_brand?${params.toString()}`;
        const res = await axios.get(url);
        setData(res.data);
        setError(null);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Unable to fetch operating expense breakdown data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [brand, ir, sku, displayMode, dateUpTo]);

  if (loading) return <ChartContainer><CircularProgress /></ChartContainer>;
  if (error) return <ChartContainer><Typography color="#999">{error}</Typography></ChartContainer>;
  if (!data.length) return <ChartContainer><Typography color="#999">No data available.</Typography></ChartContainer>;

  const barKeys = [
    'operating_expenses_commission',
    'operating_expenses_advertisements',
    'operating_expenses_promotions',
    'operating_expenses_FBA_fees',
    'operating_expenses_FBM_fees',
    'operating_expenses_FBM_shipping',
    'operating_expenses_service_fees',
    'operating_expenses_marketplace_facilitator_tax',
    'operating_expenses_revenue_chargebacks',
    'operating_expenses_returns'
  ];

  const barColors = {
    operating_expenses_commission: '#6999A8',
    operating_expenses_advertisements: '#88B0C0',
    operating_expenses_promotions: '#9FC1CF',
    operating_expenses_FBA_fees: '#AFC8DA',
    operating_expenses_FBM_fees: '#BDD0DF',
    operating_expenses_FBM_shipping: '#C9DCE8',
    operating_expenses_service_fees: '#D7E3ED',
    operating_expenses_marketplace_facilitator_tax: '#E3EBF2',
    operating_expenses_revenue_chargebacks: '#EDF3F7',
    operating_expenses_returns: '#F6FAFC'
  };

  const prettyLabel: Record<string, string> = {
    operating_expenses_commission: 'Commission',
    operating_expenses_advertisements: 'Advertisements',
    operating_expenses_promotions: 'Promotions',
    operating_expenses_FBA_fees: 'FBA Fees',
    operating_expenses_FBM_fees: 'FBM Fees',
    operating_expenses_FBM_shipping: 'FBM Shipping',
    operating_expenses_service_fees: 'Service Fees',
    operating_expenses_marketplace_facilitator_tax: 'MP Facilitator Tax',
    operating_expenses_revenue_chargebacks: 'Chargebacks',
    operating_expenses_returns: 'Returns'
  };

  const formatK = (val: string | number | undefined): string => {
    if (!val) return '$0k';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return `$${Math.round(num / 1000).toLocaleString()}k`;
  };

  const formatDollar = (val: string | number | undefined): string => {
    if (val === null || val === undefined || val === '') return '$0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '$0';
    return `$${Math.round(num).toLocaleString()}`;
  };

  const allBrands = Array.from(new Set(data.map(d => d.brand)));

  // Create combined key for chart layout
  const transformedData = data.map(d => ({
    ...d,
    xLabel: `${d.brand}|||${d.period}` // Delimiter used to split later
  }));

  // 1. Compute max stacked value from all bar keys (per bar)
  const maxStackedValue = Math.max(
    ...transformedData.map(d =>
      barKeys.reduce((sum, key) => {
        const value = ((d as unknown) as Record<string, number | undefined>)[key];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0)
    )
  );

  // 2. Set y-axis max to make space for the line above the bars
  const yAxisMax = maxStackedValue * 2.2;

  // 3. Generate line data where % is scaled relative to bar height
  const lineData = allBrands.map(brand => ({
    id: `${brand} %`,
    data: transformedData
      .filter(d => d.brand === brand)
      .map(d => {
        const value = ((d as unknown) as Record<string, number | undefined>)['Operating Expenses / Revenue %'];
        const percent = typeof value === 'number' ? value : 0;
        return {
          x: d.xLabel,
          y: (percent / 100 + 1.2) * maxStackedValue,
          rawY: percent
        };
      })
  }));

  const brandBoundaries = (() => {
    const brandCounts: Record<string, number> = {};
    transformedData.forEach(d => {
      brandCounts[d.brand] = (brandCounts[d.brand] || 0) + 1;
    });

    let cumulativeIndex = 0;
    const lines: { x: string; brand: string }[] = [];
    for (const brand of allBrands.slice(0, -1)) {
      cumulativeIndex += brandCounts[brand];
      const nextBrand = allBrands[allBrands.indexOf(brand) + 1];
      const xKey = transformedData.find(d => d.brand === nextBrand)?.xLabel;
      if (xKey) {
        lines.push({ x: xKey, brand: nextBrand });
      }
    }
    return lines;
  })();

  const brandLabelLayer = ({ xScale }: CustomLayerProps) => {
    const bandwidth = typeof (xScale as any).bandwidth === 'function' ? (xScale as any).bandwidth() : 0;
  
    return (
      <g>
        {allBrands.map(brand => {
          const items = transformedData.filter(d => d.brand === brand);
          if (!items.length) return null;
  
          const xPositions = items.map(d => {
            const scaled = (xScale as any)(d.xLabel);
            return typeof scaled === 'number' ? scaled : 0;
          });
  
          const avgX = xPositions.reduce((sum, x) => sum + x, 0) / xPositions.length + bandwidth / 2;
  
          return (
            <text
              key={brand}
              x={avgX}
              y={-10}
              textAnchor="middle"
              fill="#333"
              fontSize={14}
              fontWeight="bold"
            >
              {brand}
            </text>
          );
        })}
      </g>
    );
  };  

  const totalOpexLayer = ({ bars }: any) => {
    const topSegment = barKeys[barKeys.length - 1]; // 'operating_expenses_returns'
  
    return (
      <g>
        {bars
          .filter((bar: any) => bar.data.id === topSegment)
          .map((bar: any) => {
            const total = bar.data.data['total_operating_expenses'];
            const formatted = formatK(total); 
  
            return (
              <text
                key={`opex-label-${bar.indexValue}`}
                x={bar.x + bar.width / 2}
                y={bar.y - 12}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={700}
                fill="#47709B" 
              >
                {formatted}
              </text>
            );
          })}
      </g>
    );
  };
  

  const shiftedLineLayer = ({ lineGenerator, series, xScale }: CustomLayerProps) => {
    const bandwidth = typeof (xScale as any).bandwidth === 'function' ? (xScale as any).bandwidth() : 0;
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
    const rawBandwidth =
      typeof xScale === 'function' && 'bandwidth' in xScale
        ? (xScale as any).bandwidth()
        : 0;
    const shiftX = rawBandwidth > 2 ? rawBandwidth / 2 : 0;
  
    return (
      <g transform={`translate(${shiftX}, 0)`}>
        {points.map(point => {
          const rawY = (point.data as { rawY?: number }).rawY;
          return (
            <g key={point.id}>
              <circle cx={point.x} cy={point.y} r={5} fill={point.color} stroke="#fff" strokeWidth={1} />
              <text
                x={point.x}
                y={point.y - 12}
                textAnchor="middle"
                fill="#333"
                fontSize={11}
                fontWeight={600}
              >
                {typeof rawY === 'number' ? `${rawY.toFixed(1)}%` : ''}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <ChartContainer>
      <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
          {/* Bar Chart */}
          <Box sx={{ position: 'absolute', inset: 0 }}>
            <ResponsiveBar
              data={transformedData}
              keys={barKeys}
              indexBy="xLabel"
              valueScale={{ type: 'linear', max: yAxisMax }}
              margin={{ top: 40, right: 0, bottom: 90, left: 0 }}
              padding={0.3}
              colors={({ id }) => barColors[id as keyof typeof barColors]}
              axisBottom={{
                format: v => v.split('|||')[1], // only show period
                tickRotation: -45,
                legendOffset: 60,
                legendPosition: 'middle',
              }}
              axisLeft={null}
              axisRight={null}
              enableGridX={false}
              enableGridY={false}
              layers={[
                'grid',
                'axes',
                'bars',
                'markers',
                'legends',
                totalOpexLayer  
              ]}
              theme={nivoTheme}
              label={(d) => formatK(d.value ?? undefined)}
              valueFormat={formatK}  // also affects tooltip & internal formatting
              labelSkipHeight={14}
              labelSkipWidth={40}
              labelTextColor={(bar) => {
                const darkBars = [
                  'operating_expenses_commission',
                  'operating_expenses_advertisements',
                  'operating_expenses_promotions'
                ];
                return darkBars.includes(String(bar.data.id)) ? '#FFFFFF' : '#000000';
              }}
              tooltip={({ id, value, data }) => {
                const dynamicData = data as Record<string, number | string | undefined>;
                const totalRevenue = Number(dynamicData['total_revenue']) || 0;
                const ratio = totalRevenue > 0 ? (Number(value) / totalRevenue) * 100 : 0;
                const label = prettyLabel[id as string] ?? String(id);
              
                return (
                  <div style={{
                    background: '#fff',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    fontSize: 12,
                    lineHeight: 1.6
                  }}>
                    <div><strong>{label}</strong></div>
                    <div>Amount: {formatDollar(value)}</div>
                    <div>{ratio.toFixed(1)}% of Revenue</div>
                  </div>
                );
              }}
              markers={brandBoundaries.map(boundary => ({
                axis: 'x',
                value: boundary.x,
                lineStyle: {
                  stroke: '#aaa',
                  strokeWidth: 1,
                  strokeDasharray: '4 4'
                }
              }))}
            />
          </Box>

          {/* Line Chart Overlay */}
          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <ResponsiveLine
              data={lineData}
              xScale={{ type: 'band', round: true }}
              yScale={{ type: 'linear', min: 0, max: yAxisMax, stacked: false }}
              margin={{ top: 40, right: 0, bottom: 90, left: 0 }}
              axisLeft={null}
              axisRight={null}
              axisBottom={null}
              colors={{ scheme: 'set2' }}
              enablePoints
              pointSize={6}
              pointBorderColor={{ from: 'serieColor' }}
              pointBorderWidth={2}
              useMesh
              curve="monotoneX"
              layers={[
                'grid',
                'markers',
                'axes',
                brandLabelLayer,
                shiftedLineLayer,
                shiftedPointsLayer,
                'slices'
              ]}
              theme={nivoTheme}
              enableGridX={false}
              enableGridY={false}
              enableSlices="x"
            />
          </Box>
        </Box>
    </ChartContainer>
  );
};

export default OperatingExpenseBreakdownByBrand;
