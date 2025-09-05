import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Grid,
  useTheme,
  useMediaQuery,
  Paper,
  Fade,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ComputerIcon from '@mui/icons-material/Computer';
import { useNavigate } from 'react-router-dom';
import GradientText from '../../components/styling/GradientText';
import StarBorder from '../../components/styling/StarBorder';
import AppHeader from '../../components/common/AppHeader';
import './Home.css'; // Import the CSS file

// Styled components
const HeroSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  padding: theme.spacing(4),
  background: 'linear-gradient(135deg, #f5f9ff 0%, #e8f4ff 50%, #d8ebff 100%)',
  position: 'relative',
  flexGrow: 1,
  minHeight: 'calc(100vh - 154px)', // Account for header (64px) and feature section (90px)
  margin: 0,
  width: '100%',
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
}));

const ActionButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5, 4),
  borderRadius: 30,
  fontSize: '1rem',
  fontWeight: 600,
  marginTop: theme.spacing(4),
  backgroundColor: theme.palette.primary.main,
  color: '#ffffff',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: '0 4px 20px rgba(71, 112, 155, 0.4)',
  },
}));

const Home: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();

  const handleChatOpen = () => {
    // This will be implemented later to open a chat box
    setChatOpen(true);
    alert('Chat functionality will be implemented in the future.');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // This effect ensures the Home page is displayed without the sidebar
  useEffect(() => {
    // Add a class to the body to indicate we're on the home page
    document.body.classList.add('home-page');
    
    // Clean up when component unmounts
    return () => {
      document.body.classList.remove('home-page');
    };
  }, []);

  return (
    <Box sx={{ 
      flexGrow: 1, 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Custom Header for Home Page */}
      <AppHeader 
        showAccountIcon={true}
      />

      {/* Hero Section - Modified to fill entire space */}
      <HeroSection className="hero-gradient" sx={{
        flexGrow: 1,
        minHeight: 'calc(100vh - 154px)', /* Account for header (64px) and feature section (90px) */
        height: 'auto',
        margin: 0,
        padding: 0
      }}>
        <Container maxWidth="lg" sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          position: 'relative', 
          zIndex: 1,
          py: 4 
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} className="logo-container">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <ComputerIcon sx={{ fontSize: 48, mr: 2 }} />
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
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 600, 
                color: theme.palette.primary.main
              }}
              className="tagline"
            >
              Finance, reimagined.
            </Typography>
          </Box>
          
          <Box className="content-container">
            {/* <Typography 
              variant={isMobile ? "h4" : "h2"} 
              component="h2" 
              sx={{ 
                fontWeight: 800, 
                mb: 2,
                letterSpacing: '0.05em',
                color: theme.palette.secondary.main,
                textAlign: 'center'
              }}
              className="home-hero-text"
            >
              UNLOCK THE POWER OF AI & BI<br />
              FOR SMARTER FINANCE
            </Typography>
            
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              component="h3" 
              sx={{ 
                fontWeight: 700, 
                mb: 3,
                color: theme.palette.primary.main,
                textAlign: 'center'
              }}
              className="home-hero-subtitle"
            >
              AUTOMATE, EVALUATE, ELEVATE, DOMINATE
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ 
                maxWidth: '1200px', 
                mx: 'auto',
                color: theme.palette.text.secondary,
                fontSize: '1.1rem',
                lineHeight: 1.6,
                textAlign: 'center'
              }}
              className="home-hero-description"
            >
              <Box component="span" sx={{ display: 'block', mb: 1 }}>
                Automate accounting, Evaluate performance, Elevate strategy - Dominate your business with precision, efficiency, and foresight.
              </Box>
            </Typography> */}
            
            {/* <Box sx={{ textAlign: 'center', mt: 4 }}>
              <StarBorder
                as="div"
                className="home-hero-button-container"
                color="rgba(255, 255, 255, 1)"
                speed="30s"
                onClick={handleChatOpen}
              >
                See what you can do with Finova - Your AI Finance Partner
              </StarBorder>
            </Box> */}
          </Box>
        </Container>
      </HeroSection>

      {/* Feature Section */}
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
          zIndex: 10,
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
                className="feature-button"
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
                className="feature-button"
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
    </Box>
  );
};

export default Home; 