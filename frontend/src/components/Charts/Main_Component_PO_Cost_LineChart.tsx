import React, { useEffect, useState } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { Box, CircularProgress, Typography } from '@mui/material';
import ChartContainer from './ChartContainer';
import { nivoTheme } from './nivoTheme';
import axios from 'axios';

interface LineDatum {
  period: string;
  ir: string;
  average_procurement_cost: number | null;
}

interface LineChartProps {
  displayMode?: 'month' | 'quarter';
  dateUpTo?: Date | null;
  brand?: string;
  ir?: string;
}

const MainComponentProcurementCostLineChart: React.FC<LineChartProps> = ({
  displayMode = 'month',
  dateUpTo,
  brand,
  ir,
}) => {
  const [lineData, setLineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('displayMode', displayMode || 'month');
        if (brand) params.append('brand', brand);
        if (ir) params.append('ir', ir);
        if (dateUpTo) {
          const y = dateUpTo.getFullYear();
          const m = String(dateUpTo.getMonth() + 1).padStart(2, '0');
          const d = String(dateUpTo.getDate()).padStart(2, '0');
          params.append('dateUpTo', `${y}-${m}-${d}`);
        }

        const res = await axios.get(`/cogs_details/PO_average_cost_by_period?${params.toString()}`);
        const rawData = Array.isArray(res.data) ? res.data : res.data?.result;

        if (!Array.isArray(rawData)) {
          throw new Error('Expected array from backend, got: ' + JSON.stringify(res.data));
        }

        // Parse period strings to real Date objects
        const parsePeriod = (period: string): Date => {
          if (displayMode === 'quarter') {
            const [q, y] = period.split("'");
            const quarterStartMonth = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[q] ?? 0;
            return new Date(2000 + parseInt(y), quarterStartMonth, 1);
          } else {
            return new Date(Date.parse("1 " + period.replace("'", " 20")));
          }
        };

        // Step 1: Get all unique periods sorted
        const allPeriods = Array.from(new Set(rawData.map(e => e.period)))
          .sort((a, b) => parsePeriod(a).getTime() - parsePeriod(b).getTime());

        // Step 2: Group raw data by IR and by period
        const rawGrouped: Record<string, Record<string, number | null>> = {};
        rawData.forEach((entry) => {
          if (!rawGrouped[entry.ir]) rawGrouped[entry.ir] = {};
          rawGrouped[entry.ir][entry.period] =
            typeof entry.average_procurement_cost === 'number' && !isNaN(entry.average_procurement_cost)
              ? entry.average_procurement_cost
              : null;
        });

        // Step 3: Build complete line data, filling missing periods with null
        const formatted = Object.entries(rawGrouped).map(([ir, periodMap]) => ({
          id: ir,
          data: allPeriods.map(period => ({
            x: parsePeriod(period),
            y: periodMap[period] ?? null, // null makes line connect
          })),
        }));

        setLineData(formatted);
        setError(null);
      } catch (err) {
        console.error('Error fetching line chart data:', err);
        setError('Unable to fetch procurement cost data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [displayMode, dateUpTo, brand, ir]);

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
              xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'month' }}
              yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
              margin={{ top: 10, right: 260, bottom: 30, left: 40 }}
              axisBottom={{
                format: displayMode === 'quarter' ? "%b '%y" : "%b'%y",
                // tickValues: 'every 1 month',
                // tickSize: 5,
                // tickPadding: 5
              }}
            //   axisLeft={{
            //     tickSize: 5,
            //     // tickPadding: 5,
            //   }}
              colors={{ scheme: 'set2' }}
              pointSize={6}
              pointColor={{ theme: 'background' }}
              pointBorderWidth={2}
              pointBorderColor={{ from: 'serieColor' }}
              enableSlices="x"
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
                  itemWidth: 80,
                  itemHeight: 10,
                  symbolSize: 8,
                  symbolShape: 'circle',
                },
              ]}
            />
          </Box>
        </Box>
      </Box>
    </ChartContainer>
  );
};

export default MainComponentProcurementCostLineChart;
