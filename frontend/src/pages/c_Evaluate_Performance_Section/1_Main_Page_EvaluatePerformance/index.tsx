import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Grid,
  useTheme,
  useMediaQuery,
  Paper,
  Card,
  IconButton,
  Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ComputerIcon from '@mui/icons-material/Computer';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';
import GradientText from '../../../components/styling/GradientText';
import AppHeader from '../../../components/common/AppHeader';
import './EvaluatePerformance.css';

// Styled components
const PageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  width: '100vw',
  background: 'linear-gradient(135deg, #f5f9ff 0%, #e8f4ff 50%, #d8ebff 100%)',
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
  flexDirection: 'column', // Changed to column for this layout
  alignItems: 'center',
  justifyContent: 'flex-start', // Start from the top
}));

const FeatureCard = styled(Box)(({ theme }) => ({
  backgroundColor: '#fefefe',
  padding: theme.spacing(3),
  borderRadius: '16px',
  boxShadow: '0 6px 16px rgba(71, 112, 155, 0.15)',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minHeight: '200px', // Add minimum height for consistent card sizing
  transition: 'all 0.3s ease',
  position: 'relative',
  zIndex: 2,
  border: '1px solid rgba(175, 200, 218, 0.2)',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 12px 20px rgba(71, 112, 155, 0.2)',
    borderColor: 'rgba(71, 112, 155, 0.3)',
  },
}));

const CardTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  color: '#47709B',
  marginBottom: theme.spacing(2),
  fontSize: '1.2rem',
}));

const CardContent = styled(Typography)(({ theme }) => ({
  color: '#666',
  marginBottom: theme.spacing(1),
  fontSize: '0.9rem',
}));

const SectionTitle = styled(Box)(({ theme }) => ({
  backgroundColor: '#47709B',
  color: 'white',
  padding: theme.spacing(0.5, 4),
  borderRadius: '30px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 12px rgba(71, 112, 155, 0.2)',
  fontWeight: 'bold',
  position: 'relative',
  zIndex: 10,
  marginBottom: 0,
  width: '280px',
  height: '48px',
  textAlign: 'center',
}));

const GradientCircle = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '1550px',
  height: '1550px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(175, 200, 218, 0.8) 20%, rgba(71, 112, 155, 0.9) 60%)',
  opacity: 0.3,
  left: '50%',
  bottom: '-900px', // Positioned at the bottom
  transform: 'translateX(-50%)', // Center horizontally
  zIndex: 0,
  boxShadow: '0 0 150px 80px rgba(71, 112, 155, 0.3)',
  filter: 'blur(10px)',
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  zIndex: 3,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center', // Center the logo and text
  justifyContent: 'center',
  width: '100%',
  maxWidth: '800px',
  bottom: '160px', // Adjusted position to be more centered in the gradient circle
  left: '50%',
  transform: 'translateX(-50%)',
}));

const CardContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 2,
  width: '95%', // Set to 90% of the page width
  // paddingLeft: theme.spacing(0.5),
  // paddingRight: theme.spacing(0.5),
  paddingBottom: theme.spacing(20), // Maintain significant bottom padding to avoid overlap with logo
  margin: '0 auto',
  marginTop: '8%', // Increased space at the top
  display: 'flex',
  justifyContent: 'center', // Center the grid horizontally
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

// Semi-circle connector component
const ArcConnector = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '1850px',
  height: '1850px',
  borderTopLeftRadius: '1750px',
  borderTopRightRadius: '1750px',
  border: '12px solid #47709B',
  borderBottom: 'none',
//   top: '200px',
  left: '50%',
  bottom: '-1050px', // Positioned at the bottom
  transform: 'translateX(-50%)',
  zIndex: 1,
  boxSizing: 'border-box',
  [theme.breakpoints.down('md')]: {
    width: '500px',
    height: '250px',
    top: '180px',
  },
  [theme.breakpoints.down('sm')]: {
    display: 'none',
  },
}));

const EvaluatePerformance: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  
  // Reference to track if this is the initial render or a page refresh
  const isInitialMount = useRef(true);

  const handleNavigation = (path: string) => {
    if (path !== "#") {
      navigate(path);
    }
  };

  // This effect ensures the page is displayed without the sidebar
  useEffect(() => {
    // Add a class to the body to indicate we're on a full-page
    document.body.classList.add('full-page');
    
    // Clean up when component unmounts
    return () => {
      document.body.classList.remove('full-page');
    };
  }, []);
  
  // This effect ensures animations work correctly on both initial load and page refresh
  useEffect(() => {
    // Force a small delay to ensure CSS animations are properly triggered
    const timer = setTimeout(() => {
      // Add animation classes
      const tagline = document.querySelector('.tagline');
      const finova = document.querySelector('.finova-title');
      
      if (tagline) {
        tagline.classList.add('animate-tagline');
      }
      
      if (finova) {
        finova.classList.add('animate-finova');
      }
      
      // Force a reflow to ensure animations are applied
      document.body.style.overflow = 'hidden';
      
      // Mark that we're no longer on initial mount
      isInitialMount.current = false;
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box sx={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      margin: 0,
      padding: 0,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <PageContainer className="evaluate-performance-page">
        {/* Custom Header */}
        <AppHeader 
          showAccountIcon={true}
        />

        {/* Main Content */}
        <MainContent sx={{
          position: 'absolute',
          top: '64px', // Exactly match the AppHeader height
          left: 0,
          right: 0,
          bottom: '90px', // Account for the bottom navigation
          height: 'calc(100vh - 154px)', // 64px header + 90px footer
          margin: 0,
          padding: 0
        }}>
          {/* Semi-circle connector for the cards */}
          <ArcConnector />
          
          {/* Gradient Circle positioned at the bottom center */}
          <GradientCircle />
          
          {/* Logo Container positioned inside the Gradient Circle */}
          <LogoContainer>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 3,
              gap: 2,
            }}>
              <ComputerIcon sx={{ fontSize: 48, color: '#47709B' }} />
              <GradientText
                colors={["#5a8bbd", "#7ba7d1", "#47709B", "#5a8bbd", "#7ba7d1"]}
                animationSpeed={3}
                showBorder={false}
                className="finova-title"
              >
                {/* FINOVA */}
                FP&A
              </GradientText>
            </Box>
            
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 700, 
                color: '#47709B',
                mb: 1,
                textAlign: 'center'
              }}
              className="page-title"
            >
              Evaluate Performance
            </Typography>
            
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 600, 
                color: theme.palette.primary.main,
                textAlign: 'center'
              }}
              className="tagline"
            >
              Reimagined efficiency.
            </Typography>
          </LogoContainer>

          {/* Cards Container */}
          <CardContainer>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Grid 
                container 
                spacing={2} 
                rowGap={10} // Increase row gap for more vertical spacing
                sx={{ 
                  position: 'relative', 
                  zIndex: 2, 
                  width: '100%',
                  // maxWidth: '1600px', // Limit the maximum width
                  justifyContent: 'center', // Center grid items horizontally
                }}
              >
                {/* ROW 1 - Financial Overview in the center (3rd position) */}
                {/* 1st invisible placeholder */}
                <Grid item xs={12} sm={4} md={2.4} sx={{ padding: { md: '0 1%' } }}>
                  <Box sx={{ height: '220px', visibility: 'hidden' }} />
                </Grid>

                {/* 2nd invisible placeholder */}
                <Grid item xs={12} sm={4} md={2.4} sx={{ padding: { md: '0 1%' } }}>
                  <Box sx={{ height: '220px', visibility: 'hidden' }} />
                </Grid>

                {/* Financial Overview Card - 3rd position */}
                <Grid item xs={12} sm={4} md={2.4} sx={{ padding: { md: '0 1%' } }}>
                  <FeatureCard onClick={() => handleNavigation('/evaluate-performance/financial-overview')} sx={{ cursor: 'pointer' }}>
                    <Typography variant="h5" component="h2" sx={{ 
                      fontWeight: 700, 
                      color: '#47709B',
                      mb: 3,
                      borderBottom: '2px solid #AFC8DA',
                      pb: 1,
                      flexShrink: 0
                    }}>
                      Financial Overview
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <CardContent>• Overview financial performance</CardContent>
                      <CardContent>• Track top-level KPIs</CardContent>
                      <CardContent>• Compare performance</CardContent>
                    </Box>
                  </FeatureCard>
                </Grid>

                {/* 4th invisible placeholder */}
                <Grid item xs={0} sm={6} md={2.4} sx={{ display: { xs: 'none', md: 'block' }, padding: { md: '0 1%' } }}>
                  <Box sx={{ height: '220px', visibility: 'hidden' }} />
                </Grid>

                {/* 5th invisible placeholder */}
                <Grid item xs={0} sm={6} md={2.4} sx={{ display: { xs: 'none', md: 'block' }, padding: { md: '0 1%' } }}>
                  <Box sx={{ height: '220px', visibility: 'hidden' }} />
                </Grid>

                {/* ROW 2 - Cost (2nd position) and Profit (4th position) */}
                {/* 1st invisible placeholder - reduced to 85% width */}
                <Grid item xs={0} sm={2} md={2.0} sx={{ display: { xs: 'none', md: 'block' }, padding: { md: '0 1%' } }}>
                  <Box sx={{ height: '220px', visibility: 'hidden' }} />
                </Grid>

                {/* Cost Card - 2nd position */}
                <Grid item xs={12} sm={6} md={2.4} sx={{ padding: { md: '0 1%' } }}>
                  <FeatureCard onClick={() => handleNavigation('/evaluate-performance/cost/cogs')} sx={{ cursor: 'pointer' }}>
                    <Typography variant="h5" component="h2" sx={{ 
                      fontWeight: 700, 
                      color: '#47709B',
                      mb: 3,
                      borderBottom: '2px solid #AFC8DA',
                      pb: 1,
                      flexShrink: 0
                    }}>
                      Cost
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <CardContent>• Review COGS</CardContent>
                      <CardContent>• Breakdown operating expenses</CardContent>
                      <CardContent>• Analyze patterns</CardContent>
                    </Box>
                  </FeatureCard>
                </Grid>

                {/* 3rd invisible placeholder - increased width by 30% (15% from left + 15% from right) */}
                <Grid item xs={0} sm={0} md={3.2} sx={{ display: { xs: 'none', md: 'block' }, padding: { md: '0 1%' } }}>
                  <Box sx={{ height: '220px', visibility: 'hidden' }} />
                </Grid>

                {/* Profit Card - 4th position */}
                <Grid item xs={12} sm={6} md={2.4} sx={{ padding: { md: '0 1%' } }}>
                  <FeatureCard onClick={() => handleNavigation('/evaluate-performance/profit')} sx={{ cursor: 'pointer' }}>
                    <Typography variant="h5" component="h2" sx={{ 
                      fontWeight: 700, 
                      color: '#47709B',
                      mb: 3,
                      borderBottom: '2px solid #AFC8DA',
                      pb: 1,
                      flexShrink: 0
                    }}>
                      Profit
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <CardContent>• Measure gross margin and net profit</CardContent>
                      <CardContent>• Drill into profitability</CardContent>
                      <CardContent>• Explore trends</CardContent>
                    </Box>
                  </FeatureCard>
                </Grid>

                {/* 5th invisible placeholder - reduced to 85% width */}
                <Grid item xs={0} sm={0} md={2.0} sx={{ display: { xs: 'none', md: 'block' }, padding: { md: '0 1%' } }}>
                  <Box sx={{ height: '220px', visibility: 'hidden' }} />
                </Grid>

                {/* ROW 3 - Operation Efficiency (1st position) and Business Sustainability (5th position) */}
                {/* Operation Efficiency Card - 1st position */}
                <Grid item xs={12} sm={6} md={2.4} sx={{ padding: { md: '0 1%' } }}>
                  <FeatureCard onClick={() => handleNavigation('/evaluate-performance/operation-efficiency')} sx={{ cursor: 'pointer' }}>
                    <Typography variant="h5" component="h2" sx={{ 
                      fontWeight: 700, 
                      color: '#47709B',
                      mb: 3,
                      borderBottom: '2px solid #AFC8DA',
                      pb: 1,
                      flexShrink: 0
                    }}>
                      Operation Efficiency
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <CardContent>• Assess marketing performance</CardContent>
                      <CardContent>• Evaluate inventory turnover</CardContent>
                      <CardContent>• Identify operational bottlenecks</CardContent>
                    </Box>
                  </FeatureCard>
                </Grid>

                {/* 2nd invisible placeholder */}
                <Grid item xs={0} sm={0} md={2.4} sx={{ display: { xs: 'none', md: 'block' }, padding: { md: '0 1%' } }}>
                  <Box sx={{ height: '220px', visibility: 'hidden' }} />
                </Grid>

                {/* 3rd invisible placeholder */}
                <Grid item xs={0} sm={0} md={2.4} sx={{ display: { xs: 'none', md: 'block' }, padding: { md: '0 1%' } }}>
                  <Box sx={{ height: '220px', visibility: 'hidden' }} />
                </Grid>

                {/* 4th invisible placeholder */}
                <Grid item xs={0} sm={0} md={2.4} sx={{ display: { xs: 'none', md: 'block' }, padding: { md: '0 1%' } }}>
                  <Box sx={{ height: '220px', visibility: 'hidden' }} />
                </Grid>

                {/* Business Sustainability Card - 5th position */}
                <Grid item xs={12} sm={6} md={2.4} sx={{ padding: { md: '0 1%' } }}>
                  <FeatureCard onClick={() => handleNavigation('/evaluate-performance/business-sustainability')} sx={{ cursor: 'pointer' }}>
                    <Typography variant="h5" component="h2" sx={{ 
                      fontWeight: 700, 
                      color: '#47709B',
                      mb: 3,
                      borderBottom: '2px solid #AFC8DA',
                      pb: 1,
                      flexShrink: 0
                    }}>Business Sustainability
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <CardContent>• Visualize cash inflows and outflows</CardContent>
                      <CardContent>• Monitor Amazon payouts and reserves</CardContent>
                      <CardContent>• Understand liquidity and business runway</CardContent>
                    </Box>
                  </FeatureCard>
                </Grid>
              </Grid>
            </Box>
          </CardContainer>
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
                  className="feature-button"
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
                  className="feature-button"
                  onClick={() => handleNavigation('/elevate-strategy/revenue-strategy')}
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
    </Box>
  );
};

export default EvaluatePerformance; 