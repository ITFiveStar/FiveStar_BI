import React, { useEffect, useState } from 'react';
import { ResponsivePie } from '@nivo/pie';
import {
  Box,
  CircularProgress,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import axios from 'axios';
import ChartContainer from './ChartContainer';
import { nivoTheme } from './nivoTheme';

interface PieDatum {
  id: string;
  purchase_cost: number;
  purchase_quantity: number;
}

const BrandPOPieChart: React.FC<{ displayMode?: string; dateUpTo?: Date | null }> = ({
  displayMode = 'month',
  dateUpTo,
}) => {
  const [rawData, setRawData] = useState<PieDatum[]>([]);
  const [data, setData] = useState<{ id: string; value: number }[]>([]);
  const [valueType, setValueType] = useState<'purchase_cost' | 'purchase_quantity'>('purchase_cost');
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formattedDate, setFormattedDate] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (displayMode) params.append('displayMode', displayMode);
      if (dateUpTo) {
        const y = dateUpTo.getFullYear();
        const m = String(dateUpTo.getMonth() + 1).padStart(2, '0');
        const d = String(dateUpTo.getDate()).padStart(2, '0');
        params.append('dateUpTo', `${y}-${m}-${d}`);
      }

      const res = await axios.get(`/cogs_details/PO_pie_chart_data_brand_in_PC?${params.toString()}`);
      setRawData(res.data.pie_by_brand);
      setTotal(res.data.total[valueType]);

      const processed = res.data.pie_by_brand.map((d: PieDatum) => ({
        id: d.id,
        value: d[valueType],
      }));
      setData(processed);

      if (res.data.as_of_date) {
        const asOfDate = new Date(res.data.as_of_date);
        if (displayMode === 'month') {
          setFormattedDate(asOfDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        } else if (displayMode === 'quarter') {
          const quarterNum = Math.floor(asOfDate.getMonth() / 3) + 1;
          setFormattedDate(`Q${quarterNum} ${asOfDate.getFullYear()}`);
        } else {
          setFormattedDate(asOfDate.toLocaleDateString('en-US'));
        }
      }

      setError(null);
    } catch (err) {
      console.error(err);
      setError('No enough data available based on the selected filters.');
      setFormattedDate('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [displayMode, dateUpTo, valueType]);

  const handleValueTypeChange = (_: React.MouseEvent<HTMLElement>, newValue: typeof valueType) => {
    if (newValue) setValueType(newValue);
  };

  if (loading) return <ChartContainer><CircularProgress /></ChartContainer>;
  if (error) return <ChartContainer><Typography color="#999">{error}</Typography></ChartContainer>;

  const baseBlueShades = ['#47709B', '#5C89AE', '#7DA2C1', '#94B4CD', '#AFC8DA'];
  const otherColor = '#CCCCCC';

  const pieColors: Record<string, string> = {};
  data.forEach((d, i) => {
    pieColors[d.id] = d.id === 'Other' ? otherColor : baseBlueShades[i % baseBlueShades.length];
  });

  return (
    <ChartContainer>
      <Box sx={{ position: 'relative', height: '100%', width: '100%', padding: 0, m: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: 2, pt: 1 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={valueType}
            onChange={handleValueTypeChange}
            aria-label="Value Type"
          >
            <ToggleButton value="purchase_cost" aria-label="Purchase Cost">Procurement Cost</ToggleButton>
            <ToggleButton value="purchase_quantity" aria-label="Purchase Quantity">Procurement Quantity</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ height: '100%', width: '100%', display: 'flex', position: 'relative', minHeight: 140 }}>
          <Box sx={{ position: 'absolute', width: '100%', height: '80%', pointerEvents: 'auto' }}>
            <ResponsivePie
              data={data}
              margin={{ top: 5, right: 0, bottom: 5, left: 0 }}
              innerRadius={0.5}
              padAngle={2}
              activeOuterRadiusOffset={8}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
              colors={(d) => pieColors[d.id as string]}
              enableArcLinkLabels={false}
              arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
              valueFormat={(v) =>
                valueType === 'purchase_cost'
                  ? `$${Math.round(v / 1000).toLocaleString()}k`
                  : Math.round(v).toLocaleString()
              }
              theme={nivoTheme}
              tooltip={({ datum }) => (
                <div style={{
                  background: 'white',
                  padding: 10,
                  border: '1px solid #ccc',
                  borderRadius: 4
                }}>
                  <strong>{datum.id}</strong>: {
                    valueType === 'purchase_cost'
                      ? `$${Math.round(datum.value).toLocaleString()}`
                      : `${Math.round(datum.value).toLocaleString()} units`
                  }
                </div>
              )}
            />
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
              {formattedDate && (
                <Typography sx={{ fontWeight: 600, fontSize: 12, color: '#333' }}>
                  {formattedDate}
                </Typography>
              )}
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#47709B' }}>
                {valueType === 'purchase_cost'
                  ? `$${Math.round(total).toLocaleString()}`
                  : `${Math.round(total).toLocaleString()} units`}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </ChartContainer>
  );
};

export default BrandPOPieChart;
