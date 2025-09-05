
import React from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';

interface ChartContainerProps {
  title?: string;
  height?: string | number;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ 
  title,
  height = '100%', 
  children,
  actions
}) => {
  const theme = useTheme();
  
  return (
    <Paper
      sx={{
        height: height,
        width: '100%',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        // border: '1px solid #e0e0e0',
        overflow: 'hidden'
      }}
    >
      {(title || actions) && (
        <Box
            sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
            }}
        >
            {title && (
            <Typography
                variant="h6"
                sx={{
                color: '#47709B',
                fontWeight: 600,
                fontSize: '1rem'
                }}
            >
                {title}
            </Typography>
            )}
            {actions && (
            <Box sx={{ display: 'flex', gap: 1 }}>
                {actions}
            </Box>
            )}
        </Box>
        )}
      <Box
        sx={{
          flexGrow: 1,
          width: '100%',
          height: 'calc(100% - 40px)',
          position: 'relative'
        }}
      >
        {children}
      </Box>
    </Paper>
  );
};

export default ChartContainer;