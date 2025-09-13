import React, { useEffect, useState, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface POGanttChartProps {
  brand?: string;
  ir?: string;
  poStartDate: Date | null;
  poEndDate: Date | null;
  targetDSI: string;
}

const formatDate = (date: Date | null) => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const POGanttChart: React.FC<POGanttChartProps> = ({ brand, ir, poStartDate, poEndDate, targetDSI }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Check if all required inputs are present
  const hasAllInputs = () => {
    const startValid = poStartDate instanceof Date && !isNaN(poStartDate.getTime());
    const endValid = poEndDate instanceof Date && !isNaN(poEndDate.getTime());
    return startValid && endValid && !!targetDSI;
  };

  // Function to render chart
  const renderChart = async () => {
    if (!hasAllInputs()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build URL with all parameters
      const params = new URLSearchParams();
      if (brand) params.append('brand', brand);
      if (ir) params.append('ir', ir);
      params.append('po_start_date', formatDate(poStartDate));
      params.append('po_end_date', formatDate(poEndDate));
      params.append('target_consumption_dsi', targetDSI);
      params.append('direct_html', 'true');

      // Use direct URL approach with environment variable
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? '/api' 
        : (process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000');
      const directUrl = `${API_BASE_URL}/evaluate_strategy/po_gantt_chart?${params.toString()}`;

      // Update the iframe
      if (chartContainerRef.current) {
        // Clear previous content
        chartContainerRef.current.innerHTML = '';
        
        // Create iframe with fixed height
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%'; // Use a large fixed height
        iframe.style.border = 'none';
        iframe.src = directUrl;
        
        // Append iframe
        chartContainerRef.current.appendChild(iframe);
      }
    } catch (err: any) {
      console.error('Error rendering chart:', err);
      setError(`Failed to load chart: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch chart when filters change
  useEffect(() => {
    // Skip if no valid inputs
    if (!hasAllInputs()) {
      return;
    }
    
    // Render the chart when all inputs are valid
    renderChart();
  }, [brand, ir, poStartDate, poEndDate, targetDSI]);

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', // Use a large fixed height for the container
      position: 'relative'
    }}>
      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%', 
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: 'rgba(255,255,255,0.7)',
          zIndex: 10
        }}>
          <CircularProgress size={40} />
        </Box>
      ) : error ? (
        <Box sx={{ 
          padding: 2, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%'
        }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : null}
      
      <Box 
        ref={chartContainerRef} 
        sx={{ 
          width: '100%', 
          height: '100%', // Use a large fixed height
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {!hasAllInputs() && (
          <Typography 
            sx={{ 
              color: 'text.disabled', 
              textAlign: 'center',
              padding: 3
            }}
          >
            Please complete all required fields (Start Date, End Date, and Target DSI) to generate the PO Gantt chart.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default POGanttChart;
