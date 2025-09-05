import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box,
  useTheme
} from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';

interface AppHeaderProps {
  showAccountIcon?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  showAccountIcon = true
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <AppBar position="fixed" sx={{ 
      boxShadow: 1, 
      width: '100%',
      backgroundColor: '#47709B',
      height: '64px',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1100
    }}>
      <Toolbar sx={{ height: '100%' }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.9
            }
          }}
          onClick={handleLogoClick}
        >
          <ComputerIcon sx={{ fontSize: 28, color: '#fff', mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ 
            fontWeight: 600,
            letterSpacing: '0.05em'
          }}>
            {/* FINOVA */}
            FP&A
          </Typography>
        </Box>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {showAccountIcon && (
          <IconButton color="inherit">
            <AccountCircle />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader; 