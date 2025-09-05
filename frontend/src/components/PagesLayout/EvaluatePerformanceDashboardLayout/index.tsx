import React from 'react';
import { 
    Box, 
    Container, 
    Grid, 
    Typography, 
    Button,
    Paper,
    useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PaymentsIcon from '@mui/icons-material/Payments';
import PaidIcon from '@mui/icons-material/Paid';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import AppHeader from '../../common/AppHeader';
import SidebarNav, { type NavItem } from '../../common/SidebarNav';
import './DashboardLayout.css';

export interface EvaluatePerformanceDashboardLayoutProps {
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
  background: '#f5f9ff', // Light blue background
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
  width: 'calc(100% - 240px)', // Adjust for sidebar width
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(3),
  marginLeft: '270px', // Match sidebar width
  overflow: 'hidden',
  [theme.breakpoints.down('md')]: {
    width: '100%',
    marginLeft: 0,
    padding: theme.spacing(2),
  },
}));

const Sidebar = styled(Box)(({ theme }) => ({
  width: '270px',
  height: '100%',
  backgroundColor: '#ffffff',
  borderRight: '1px solid #e0e0e0',
  position: 'fixed',
  left: 0,
  top: 64, // AppHeader height
  bottom: 90, // Feature section height
  overflowY: 'auto',
  zIndex: 10,
  [theme.breakpoints.down('md')]: {
    display: 'none',
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

const BentoContainer = styled(Paper)(({ theme }) => ({
  border: '1px dashed #aaa',
  borderRadius: 8,
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#ffffff',
}));

const DashboardLayout: React.FC<EvaluatePerformanceDashboardLayoutProps> = ({ children, pageTitle }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const handleNavigation = (path: string) => {
        navigate(path);
    };

    // Navigation items for the sidebar
    
    const navItems: NavItem[] = [
        {
          text: 'Financial Overview',
          icon: <DashboardIcon />,
          // path: '/evaluate-performance/financial-overview',
        },
        { type: 'divider' },
        {
          text: 'Cost',
          icon: <PaymentsIcon />,
          // path: '/evaluate-performance/cost',
          children: [
            {
              text: 'COGS',
              // path: '/evaluate-performance/cost/cogs',
            },
            {
              text: 'Operating Expenses',
              // path: '/evaluate-performance/cost/operating-expenses',
            },
          ],
        },
        { type: 'divider' },
        {
          text: 'Profit',
          icon: <PaidIcon />,
          // path: '/evaluate-performance/profit',
          children: [
            {
              text: 'P&L Report',
              path: '/evaluate-performance/pnl-report',
            },
            {
              text: 'Profitability Report',
              path: '/evaluate-performance/profitability-report',
            },
          ],
        },
        { type: 'divider' },
        {
          text: 'Operation Efficiency',
          icon: <TrendingUpIcon />,
          // path: '/evaluate-performance/operation-efficiency',
        },
        { type: 'divider' },
        {
          text: 'Business Sustainability',
          icon: <AllInclusiveIcon />,
          // path: '/evaluate-performance/business-sustainability',
        },
        // { type: 'divider' },
        // {
        //   text: 'Returns Report',
        //   icon: <PaidIcon />,
        //   path: '/evaluate-performance/returns-report',
        // },
    ];

  return (
    <PageContainer className="evaluate-performance-dashboard-container">
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
        {/* Sidebar Navigation */}
        <Sidebar>
          <SidebarNav items={navItems} />
        </Sidebar>

        {/* Content Wrapper */}
        <ContentWrapper className="evaluate-performance-dashboard-content-wrapper">
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
            height: 'calc(100% - 56px)',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto' // This prevents content from creating extra space
          }}>
            {children}
          </Box>
        </ContentWrapper>
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
                className={currentPath.includes('evaluate-performance') ? 'feature-button active' : 'feature-button'}
                // onClick={() => handleNavigation('/evaluate-performance')}
                onClick={() => handleNavigation('/evaluate-performance/pnl-report')}
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
                // onClick={() => handleNavigation('/elevate-strategy/revenue-strategy')}
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

export default DashboardLayout; 