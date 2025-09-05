import React from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Stepper, 
  Step, 
  StepLabel, 
  StepContent,
  Paper,
  Button,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../../common/AppHeader';
import './COGSLayout.css';

// Styled components
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
  [theme.breakpoints.down('md')]: {
    flexDirection: 'column',
  },
}));

const LeftColumn = styled(Box)(({ theme }) => ({
  width: '25%',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(4),
  backgroundColor: '#E8F4FF',
  boxShadow: '0 0 15px rgba(0, 0, 0, 0.05)',
  [theme.breakpoints.down('md')]: {
    width: '100%',
    minHeight: 'auto',
    padding: theme.spacing(2),
  },
}));

const RightColumn = styled(Box)(({ theme }) => ({
  width: '75%',
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(4),
  [theme.breakpoints.down('md')]: {
    width: '100%',
    padding: theme.spacing(2),
  },
}));

const StepperTitle = styled(Typography)(({ theme }) => ({
  color: '#47709B',
  fontSize: '1.25rem',
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  marginTop: theme.spacing(2),
  borderBottom: `2px solid ${theme.palette.primary.light}`,
  paddingBottom: theme.spacing(1),
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

const CustomStepLabel = styled(StepLabel)(({ theme }) => ({
  '& .MuiStepLabel-label': {
    color: '#47709B',
    fontWeight: 500,
  },
  '& .MuiStepLabel-label.Mui-active': {
    color: '#47709B',
    fontWeight: 700,
  },
  '& .MuiStepLabel-label.Mui-completed': {
    color: '#47709B',
  },
  '& .MuiStepIcon-root': {
    color: '#AFC8DA',
  },
  '& .MuiStepIcon-root.Mui-active': {
    color: '#47709B',
  },
  '& .MuiStepIcon-root.Mui-completed': {
    color: '#47709B',
  },
}));

const StepDescription = styled(Typography)(({ theme }) => ({
  color: '#666',
  fontSize: '0.85rem',
  marginTop: theme.spacing(0.5),
}));

// Step data structure
interface StepItem {
  title: string;
  description: string;
  path: string;
}

interface SectionItem {
  title: string;
  steps: StepItem[];
}

// The workflow sections and steps
const workflowSteps: SectionItem[] = [
  {
    title: "Input",
    steps: [
      {
        title: "Record Purchase Orders",
        description: "to track raw material procurement",
        path: "/automate-accounting/purchase-orders"
      },
      {
        title: "Log Manufacture Orders",
        description: "to convert raw materials into finished SKUs",
        path: "/automate-accounting/manufacture-orders"
      },
      {
        title: "Register Stock Addition & Exchange",
        description: "to directly import SKUs and swap manufactured SKUs",
        path: "/automate-accounting/stock-addition-exchange"
      }
    ]
  },
  {
    title: "Link",
    steps: [
      {
        title: "Sync Sales Records",
        description: "to track outbound SKUs",
        path: "/automate-accounting/sales-records"
      },
      {
        title: "Retrieve Returned Products",
        description: "to reintegrate returned SKUs for resale",
        path: "/automate-accounting/returns-records"
      }
    ]
  },
  {
    title: "Complete",
    steps: [
      {
        title: "Calculate Manufacture Cost",
        description: "to allocate raw materials and procurement costs to manufactured SKUs using FIFO methodology",
        path: "/automate-accounting/manufacture-results"
      },
      {
        title: "Generate COGS",
        description: "to apply FIFO logic to match sales orders with manufactured SKUs and determine corresponding COGS",
        path: "/automate-accounting/cogs-results"
      },
      {
        title: "Record COGS in Ledger",
        description: "to review total COGS incurred over a period and complete automatic booking in QuickBooks",
        path: "/automate-accounting/quickbooks/cogs"
      }
    ]
  }
];

interface COGSLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

const COGSLayout: React.FC<COGSLayoutProps> = ({ children, pageTitle }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Find the active step
  const getActiveStep = (): { sectionIndex: number, stepIndex: number } => {
    for (let i = 0; i < workflowSteps.length; i++) {
      const section = workflowSteps[i];
      for (let j = 0; j < section.steps.length; j++) {
        if (section.steps[j].path === currentPath) {
          return { sectionIndex: i, stepIndex: j };
        }
      }
    }
    return { sectionIndex: -1, stepIndex: -1 };
  };

  const { sectionIndex, stepIndex } = getActiveStep();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <PageContainer className="cogs-workflow-container">
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
        {/* Left Column with Stepper */}
        <LeftColumn>
          <Typography variant="h4" sx={{ 
            color: '#47709B', 
            fontWeight: 700, 
            mb: 4,
            borderBottom: `2px solid ${theme.palette.primary.main}`,
            pb: 1
          }}
          className="page-title">
            COGS Workflow
          </Typography>
          
          {workflowSteps.map((section, sectionIdx) => (
            <Box key={`section-${sectionIdx}`} sx={{ mb: 3 }}>
              <StepperTitle>{section.title}</StepperTitle>
              <Stepper orientation="vertical" nonLinear sx={{ mt: 1 }}>
                {section.steps.map((step, stepIdx) => (
                  <Step 
                    key={step.title} 
                    active={sectionIndex === sectionIdx && stepIndex === stepIdx}
                    completed={
                      sectionIndex > sectionIdx || 
                      (sectionIndex === sectionIdx && stepIndex > stepIdx)
                    }
                  >
                    <CustomStepLabel 
                      onClick={() => handleNavigation(step.path)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 }
                      }}
                    >
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {step.title}
                        </Typography>
                        <StepDescription>{step.description}</StepDescription>
                      </Box>
                    </CustomStepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          ))}
        </LeftColumn>

        {/* Right Column with Page Content */}
        <RightColumn className="cogs-content-wrapper" sx={{
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

export default COGSLayout; 