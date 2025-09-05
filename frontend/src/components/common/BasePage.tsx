import React from 'react';
import { Box } from '@mui/material';

interface BasePageProps {
  children: React.ReactNode;
}

/**
 * BasePage Component
 * 
 * A simplified page container for use within layout components that already 
 * provide their own header/navigation elements (like COGSLayout).
 * This doesn't include a title or breadcrumbs.
 */
const BasePage: React.FC<BasePageProps> = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 0,
        boxSizing: 'border-box',
        overflow: 'auto'
      }}
    >
      {children}
    </Box>
  );
};

export default BasePage; 