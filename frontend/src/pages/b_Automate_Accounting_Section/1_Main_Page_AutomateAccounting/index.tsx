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
import './AutomateAccounting.css';

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
  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
  },
}));

const LeftColumn = styled(Box)(({ theme }) => ({
  width: '33%',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: theme.spacing(4),
  paddingLeft: theme.spacing(4),
  marginLeft: 0,
  [theme.breakpoints.down('md')]: {
    width: '100%',
    minHeight: '300px',
    alignItems: 'center',
    padding: theme.spacing(4),
  },
}));

const RightColumn = styled(Box)(({ theme }) => ({
  width: '67%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  overflow: 'hidden',
  padding: theme.spacing(0, 4, 0, 2),
  [theme.breakpoints.down('md')]: {
    width: '100%',
    padding: theme.spacing(3, 2),
  },
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

const CarouselContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  marginBottom: theme.spacing(2),
  marginTop: '20px',
}));

const CardStack = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '350px',
  width: '95%',
  margin: '0 auto',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  position: 'absolute',
  width: '100%',
  height: '330px',
  borderRadius: '16px',
  boxShadow: '0 8px 24px rgba(71, 112, 155, 0.15)',
  backgroundColor: 'white',
  transition: 'all 0.3s ease',
  overflow: 'hidden',
}));

const ScrollableCardContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
}));

const PostItCard = styled(Box)(({ theme }) => ({
  backgroundColor: '#fefefe',
  padding: theme.spacing(2),
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  border: '1px solid #e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  height: '180px',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 6px 12px rgba(71, 112, 155, 0.2)',
    borderColor: '#AFC8DA',
  },
}));

const PostItTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  color: '#47709B',
  marginBottom: theme.spacing(1),
}));

const PostItText = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: '#666',
}));

const CarouselDots = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginTop: theme.spacing(2),
  gap: theme.spacing(1),
}));

const CarouselDot = styled(Box)<{ active: boolean }>(({ theme, active }) => ({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  backgroundColor: active ? '#47709B' : '#AFC8DA',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: active ? '#47709B' : '#8FABC4',
  },
}));

const GradientCircle = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '950px',
  height: '950px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(175, 200, 218, 0.8) 20%, rgba(71, 112, 155, 0.9) 60%)',
  opacity: 0.3,
  left: '-300px',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 0,
  boxShadow: '0 0 150px 80px rgba(71, 112, 155, 0.3)',
  filter: 'blur(10px)',
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',
  width: '100%',
  maxWidth: '500px',
  [theme.breakpoints.down('md')]: {
    alignItems: 'center',
    maxWidth: '100%',
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

// Interface for post-it card data
interface PostItCardData {
  title: string;
  link: string;
  text: string;
}

// Interface for carousel card data
interface CarouselCardData {
  title: string;
  cards: PostItCardData[];
}

const AutomateAccounting: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  // State for carousel
  const [cogsActiveIndex, setCogsActiveIndex] = useState(0);
  const [amazonActiveIndex] = useState(0); // Only one card for Amazon Proceeds

  // Reference to track if this is the initial render or a page refresh
  const isInitialMount = useRef(true);

  // COGS cards data
  const cogsCards: CarouselCardData[] = [
    {
      title: "Input",
      cards: [
        {
          title: "Record Purchase Orders",
          link: "/automate-accounting/purchase-orders",
          text: "to track raw material procurement"
        },
        {
          title: "Log Manufacture Orders",
          link: "/automate-accounting/manufacture-orders",
          text: "to convert raw materials into finished SKUs"
        },
        {
          title: "Register Stock Addition & Exchange",
          link: "/automate-accounting/stock-addition-exchange",
          text: "to directly import SKUs and swap manufactured SKUs"
        }
      ]
    },
    {
      title: "Link",
      cards: [
        {
          title: "Sync Sales Records",
          link: "/automate-accounting/sales-records",
          text: "to track outbound SKUs"
        },
        {
          title: "Retrieve Returned Products",
          link: "/automate-accounting/returns-records",
          text: "to reintegrate returned SKUs for resale"
        }
      ]
    },
    {
      title: "Complete",
      cards: [
        {
          title: "Calculate Manufacture Cost",
          link: "/automate-accounting/manufacture-results",
          text: "to allocate raw materials and procurement costs to manufactured SKUs using FIFO methodology"
        },
        {
          title: "Generate COGS",
          link: "/automate-accounting/cogs-results",
          text: "to apply FIFO logic to match sales orders with manufactured SKUs and determine corresponding COGS"
        },
        {
          title: "Record COGS in Ledger",
          link: "/automate-accounting/quickbooks/cogs",
          text: "to review total COGS incurred over a period and complete automatic booking in QuickBooks"
        }
      ]
    }
  ];

  // Amazon Proceeds cards data
  const amazonCards: CarouselCardData[] = [
    {
      title: "QuickBooks Booking & Review",
      cards: [
        {
          title: "Book Month-End Financials",
          link: "/automate-accounting/quickbooks/month-end",
          text: "to process and book journals for deposits during order month and AR AP estimates"
        },
        {
          title: "Book Post Month-End Financials",
          link: "/automate-accounting/quickbooks/statement-decomp",
          text: "to process and book journals for deposits post order month with AR AP Closure and Adjustments"
        },
        {
          title: "Review Marketplace Proceeds",
          link: "#",
          text: "to visualize the detailed cash flow of Marketplace Proceeds and track revenue and expenses flow"
        }
      ]
    }
  ];

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

  // Function to render stacked cards without framer-motion
  const renderStackedCards = (cards: CarouselCardData[], activeIndex: number, setActiveIndex: React.Dispatch<React.SetStateAction<number>>) => {
    return (
      <CardStack>
        {/* Stacked cards for visual effect only - furthest back */}
        <Box 
          sx={{ 
            position: 'absolute',
            top: -30,
            right: -40,
            width: '100%',
            height: '330px',
            borderRadius: '16px',
            backgroundColor: 'white',
            boxShadow: '0 8px 24px rgba(71, 112, 155, 0.15)',
            zIndex: 1,
            opacity: 0.6,
          }}
        />
        
        {/* Middle stacked card */}
        <Box 
          sx={{ 
            position: 'absolute',
            top: -10,
            right: -20,
            width: '100%',
            height: '330px',
            borderRadius: '16px',
            backgroundColor: 'white',
            boxShadow: '0 8px 24px rgba(71, 112, 155, 0.15)',
            zIndex: 2,
            opacity: 0.8,
          }}
        />
        
        {/* Main active card - front */}
        <StyledCard sx={{ zIndex: 3, marginTop: '10px' }}>
          <ScrollableCardContent>
            <Typography variant="h5" component="h2" sx={{ 
              fontWeight: 700, 
              color: '#47709B',
              mb: 3,
              borderBottom: '2px solid #AFC8DA',
              pb: 1,
              flexShrink: 0
            }}>
              {cards[activeIndex].title}
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'row',
              gap: 3,
              overflowX: 'auto',
              overflowY: 'hidden',
              pb: 2,
              flexGrow: 1,
              alignItems: 'center',
              height: '230px',
              paddingTop: '10px',
              paddingLeft: '20px',
              paddingRight: '20px',
              justifyContent: 'space-between',
              width: '100%',
            }}>
              {/* Render actual cards */}
              {cards[activeIndex].cards.map((postIt, postItIndex) => (
                <PostItCard 
                  key={postItIndex}
                  onClick={() => handleNavigation(postIt.link)}
                  sx={{
                    flex: '1 0 30%',
                    maxWidth: '32%',
                    minWidth: '240px',
                    marginBottom: 0,
                    height: '180px',
                    justifyContent: 'space-between',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <PostItTitle variant="h6" sx={{ mb: 1 }}>
                    {postIt.title}
                  </PostItTitle>
                  <PostItText sx={{ flexGrow: 1 }}>
                    {postIt.text}
                  </PostItText>
                </PostItCard>
              ))}
              
              {/* Add invisible placeholder cards if needed */}
              {cards[activeIndex].cards.length < 3 && (
                Array(3 - cards[activeIndex].cards.length).fill(0).map((_, index) => (
                  <Box 
                    key={`placeholder-${index}`}
                    sx={{
                      flex: '1 0 30%',
                      maxWidth: '32%',
                      minWidth: '240px',
                      height: '180px',
                      visibility: 'hidden', // Make it invisible
                    }}
                  />
                ))
              )}
            </Box>
          </ScrollableCardContent>
        </StyledCard>
      </CardStack>
    );
  };

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
      <PageContainer className="automate-accounting-page">
        {/* Custom Header */}
        <AppHeader 
          showAccountIcon={true}
        />

        {/* Main Content - Adjusted to eliminate the gap */}
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
          {/* Left Column with Gradient Circle and Logo */}
          <LeftColumn>
            <GradientCircle />
            <LogoContainer>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 3,
                width: '100%',
                gap: 0
              }}>
                <ComputerIcon sx={{ fontSize: 48, color: '#47709B', marginRight: '16px' }} />
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
                  width: '100%'
                }}
                className="page-title"
              >
                Automate Accounting
              </Typography>
              
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 600, 
                  color: theme.palette.primary.main,
                  alignSelf: 'flex-start',
                  marginLeft: '2px',
                  [theme.breakpoints.down('md')]: {
                    alignSelf: 'center',
                    marginLeft: 0,
                  }
                }}
                className="tagline"
              >
                Reimagined precision.
              </Typography>
            </LogoContainer>
          </LeftColumn>

          {/* Right Column with COGS and Amazon Proceeds */}
          <RightColumn sx={{ 
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', // Center content vertically
            height: '100%',
            paddingTop: 5,
            paddingBottom: 0,
            paddingRight: 15,
            alignItems: 'flex-start',
            gap: '40px' // Increase gap between sections
          }}>
            {/* COGS Section */}
            <Box sx={{ width: '100%', position: 'relative' }}>
              <SectionTitle sx={{ 
                position: 'absolute', 
                top: '-15px',
                left: '10px',
                zIndex: 10
              }}>
                <Typography variant="h5" component="span" sx={{ 
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: 'white',
                  width: '100%',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  COGS
                </Typography>
              </SectionTitle>
              
              <CarouselContainer>
                {renderStackedCards(cogsCards, cogsActiveIndex, setCogsActiveIndex)}
                
                {/* Carousel Dots */}
                <CarouselDots>
                  {cogsCards.map((_, index) => (
                    <CarouselDot 
                      key={index}
                      active={index === cogsActiveIndex}
                      onClick={() => setCogsActiveIndex(index)}
                    />
                  ))}
                </CarouselDots>
              </CarouselContainer>
            </Box>

            {/* Amazon Proceeds Section */}
            <Box sx={{ width: '100%', position: 'relative' }}>
              <SectionTitle sx={{ 
                position: 'absolute', 
                top: '-15px',
                left: '10px',
                zIndex: 10
              }}>
                <Typography variant="h5" component="span" sx={{ 
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: 'white',
                  width: '100%',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  Marketplace Proceeds
                </Typography>
              </SectionTitle>
              
              <CarouselContainer>
                <CardStack>
                  {/* Stacked cards for visual effect only - furthest back */}
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      top: -30,
                      right: -40,
                      width: '100%',
                      height: '330px',
                      borderRadius: '16px',
                      backgroundColor: 'white',
                      boxShadow: '0 8px 24px rgba(71, 112, 155, 0.15)',
                      zIndex: 1,
                      opacity: 0.6,
                    }}
                  />
                  
                  {/* Middle stacked card */}
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      top: -10,
                      right: -20,
                      width: '100%',
                      height: '330px',
                      borderRadius: '16px',
                      backgroundColor: 'white',
                      boxShadow: '0 8px 24px rgba(71, 112, 155, 0.15)',
                      zIndex: 2,
                      opacity: 0.8,
                    }}
                  />
                  
                  {/* Main card - front */}
                  <StyledCard sx={{ zIndex: 3, marginTop: '10px' }}>
                    <ScrollableCardContent>
                      <Typography variant="h5" component="h2" sx={{ 
                        fontWeight: 700, 
                        color: '#47709B',
                        mb: 3,
                        borderBottom: '2px solid #AFC8DA',
                        pb: 1
                      }}>
                        {amazonCards[0].title}
                      </Typography>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'row',
                        gap: 3,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        pb: 2,
                        flexGrow: 1,
                        alignItems: 'center',
                        height: '230px',
                        paddingTop: '10px',
                        paddingLeft: '20px',
                        paddingRight: '20px',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}>
                        {amazonCards[0].cards.map((postIt, postItIndex) => (
                          <PostItCard 
                            key={postItIndex}
                            onClick={() => handleNavigation(postIt.link)}
                            sx={{
                              flex: '1 0 30%',
                              maxWidth: '32%',
                              minWidth: '240px',
                              marginBottom: 0,
                              height: '180px',
                              justifyContent: 'space-between',
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            <PostItTitle variant="h6" sx={{ mb: 1 }}>
                              {postIt.title}
                            </PostItTitle>
                            <PostItText sx={{ flexGrow: 1 }}>
                              {postIt.text}
                            </PostItText>
                          </PostItCard>
                        ))}
                      </Box>
                    </ScrollableCardContent>
                  </StyledCard>
                </CardStack>
              </CarouselContainer>
            </Box>
          </RightColumn>
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
                  className="feature-button active"
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
      </PageContainer>
    </Box>
  );
};

export default AutomateAccounting; 