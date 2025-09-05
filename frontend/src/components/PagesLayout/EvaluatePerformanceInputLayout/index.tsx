import React from 'react';
import { 
    Box, 
    Container, 
    Grid, 
    Typography, 
    Button,
    useTheme
  } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../../common/AppHeader';
import './DashboardInput.css';

export interface InputLayoutProps {
  children: React.ReactNode;
  pageTitle?: string; // Optional prop for page title
}

const PageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  width: '100vw',
  background: '#ffffff',
  overflow: 'hidden',
  position: 'relative',
  margin: 0,
  padding: 0,
  left: 0,
  right: 0,
  boxSizing: 'border-box',
}));

const MainContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  width: '100%',
  padding: 0,
  margin: 0,
  overflow: 'hidden',
  position: 'relative',
  background: '#ffffff',
}));

const ContentColumn = styled(Box)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(4),
  [theme.breakpoints.down('md')]: {
    width: '100%',
    padding: theme.spacing(2),
  },
}));

const FeatureButton = styled(Button)(({ theme }) => ({
    borderRadius: 0,
    padding: theme.spacing(3, 4),
    margin: theme.spacing(1),
    transition: 'all 0.3s ease',
    borderBottom: `3px solid transparent`,
    backgroundColor: 'transparent',
    color: theme.palette.text.primary,
    '&:hover': {
      transform: 'translateY(-5px)',
      borderBottom: `3px solid ${theme.palette.primary.main}`,
      backgroundColor: 'rgba(175, 200, 218, 0.1)',
    },
    '&.active': {
      transform: 'translateY(-5px)',
      borderBottom: `3px solid ${theme.palette.primary.main}`,
      backgroundColor: 'rgba(175, 200, 218, 0.1)',
    },
  }));

const InputLayout: React.FC<InputLayoutProps> = ({ children, pageTitle }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const handleNavigation = (path: string) => {
        navigate(path);
      };

  return (
    <PageContainer className="evaluate-performance-input-container">
      {/* Custom Header */}
      <AppHeader showAccountIcon={true} />

      {/* Main Content */}
      <MainContent sx={{
        position: 'absolute',
        top: '64px', // Match AppHeader height
        left: 0,
        right: 0,
        bottom: '90px', // Account for bottom navigation
        height: 'calc(100vh - 154px)', // 64px header + 90px footer
        margin: 0,
        padding: 0
      }}>
        {/* Content Column */}
        <ContentColumn className="evaluate-performance-input-content-column evaluate-performance-input-content-wrapper" sx={{
          // backgroundColor: 'rgba(200, 200, 255, 0.1)',  // Light color to see the bounds
          // border: '1px dashed #999',                   // Dashed border to see the limits
          height: '100%',                             // Try to ensure full height
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h4" sx={{ 
            color: '#47709B', 
            fontWeight: 700, 
            mb: 4,
            borderBottom: `2px solid #47709B`,
            pb: 1
          }}
          className="page-title">
            {pageTitle}
          </Typography>
          
          {/* Wrap children in a Box that will expand to fill available space */}
          <Box sx={{
            height: '100%',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto' // This prevents content from creating extra space
          }}>
            {children}
          </Box>
        </ContentColumn>
      </MainContent>

      {/* Feature Section (Bottom Navigation) */}
      <Box 
        sx={{ 
          py: 0, 
          backgroundColor: '#ffffff',
          borderTop: `1px solid ${theme.palette.primary.light}`,
          mb: 0,
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: '90px'
        }}
        className="feature-section"
      >
        <Container maxWidth="lg">
          <Grid 
            container 
            spacing={2} 
            justifyContent="center"
            sx={{ 
              textAlign: 'center',
              height: '100%'
            }}
          >
            <Grid item xs={12} sm={4}>
              <FeatureButton 
                fullWidth 
                className={currentPath.includes('automate-accounting') ? 'feature-button active' : 'feature-button'}
                onClick={() => handleNavigation('/automate-accounting')}
              >
                <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                  Automate Accounting
                </Typography>
              </FeatureButton>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FeatureButton 
                fullWidth 
                className="feature-button active"
                onClick={() => handleNavigation('/evaluate-performance')}
              >
                <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                  Evaluate Performance
                </Typography>
              </FeatureButton>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FeatureButton 
                fullWidth 
                className={currentPath.includes('elevate-strategy') ? 'feature-button active' : 'feature-button'}
                onClick={() => handleNavigation('/elevate-strategy')}
              >
                <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
                  Elevate Strategy
                </Typography>
              </FeatureButton>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </PageContainer>
  );
};

export default InputLayout; 