import React, { Suspense } from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { store } from './store';
import { theme } from './theme';
import { routes } from './routes';
import { SnackbarProvider } from 'notistack';

import COGSLayout from './components/PagesLayout/COGSLayout';
import QuickbookBookingLayout from './components/PagesLayout/QuickbookBookingLayout';
import InputLayout from './components/PagesLayout/EvaluatePerformanceInputLayout';
import DashboardLayout from './components/PagesLayout/EvaluatePerformanceDashboardLayout';
import ElevateStrategyDashboardLayout from './components/PagesLayout/ElevateStrategyDashboardLayout';


const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

// Component to conditionally render the Layout
const AppContent = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Main pages that should use full page layout
  const isHomePage = currentPath === '/';
  const isAutomateAccountingPage = currentPath === '/automate-accounting';
  const isEvaluatePerformancePage = currentPath === '/evaluate-performance';
  const isElevateStrategyPage = currentPath === '/elevate-strategy';
  const isFullPageRoute = isHomePage || isAutomateAccountingPage || isEvaluatePerformancePage || isElevateStrategyPage;
  // Find route components
  const homeRoute = routes.find(route => route.path === '/');
  const automateAccountingRoute = routes.find(route => route.path === '/automate-accounting');
  const evaluatePerformanceRoute = routes.find(route => route.path === '/evaluate-performance');
  const elevateStrategyRoute = routes.find(route => route.path === '/elevate-strategy');
  const HomeComponent = homeRoute ? homeRoute.component : null;
  const AutomateAccountingComponent = automateAccountingRoute ? automateAccountingRoute.component : null;
  const EvaluatePerformanceComponent = evaluatePerformanceRoute ? evaluatePerformanceRoute.component : null;
  const ElevateStrategyComponent = elevateStrategyRoute ? elevateStrategyRoute.component : null;
  
  // COGS workflow pages that should use the COGSLayout
  const COGSWorkflowPaths = [
    '/automate-accounting/purchase-orders',
    '/automate-accounting/manufacture-orders',
    '/automate-accounting/stock-addition-exchange',
    '/automate-accounting/sales-records',
    '/automate-accounting/returns-records',
    '/automate-accounting/manufacture-results',
    '/automate-accounting/cogs-results',
    '/automate-accounting/quickbooks/cogs'
  ];
  const isCOGSWorkflowPage = COGSWorkflowPaths.some(path => 
    currentPath === path || currentPath.startsWith(`${path}/`)
  );
  // Get page title for COGS workflow pages
  const getCOGSWorkFlowPageTitle = (): string => {
    // Default titles based on path
    if (currentPath === '/automate-accounting/purchase-orders') return 'Purchase Orders';
    if (currentPath === '/automate-accounting/manufacture-orders') return 'Manufacture Orders';
    if (currentPath === '/automate-accounting/stock-addition-exchange') return 'Stock Addition & Exchange';
    if (currentPath === '/automate-accounting/sales-records') return 'Sales Records';
    if (currentPath === '/automate-accounting/returns-records') return 'Returns Records';
    if (currentPath === '/automate-accounting/manufacture-results') return 'Manufacture Results';
    if (currentPath === '/automate-accounting/cogs-results') return 'COGS Generation';
    if (currentPath === '/automate-accounting/quickbooks/cogs') return 'COGS Booking in QuickBooks';
    return 'COGS Workflow';
  };
  
  // QuickBook Booking workflow pages
  const AmazonProceeds_QuickbooksBookingPaths = [
    '/automate-accounting/quickbooks/month-end',
    '/quickbooks/post-month-end',
    '/automate-accounting/quickbooks/statement-decomp'
  ];
  const isAmazonProceedsQBBookingPage = AmazonProceeds_QuickbooksBookingPaths.some(path => 
    currentPath === path || currentPath.startsWith(`${path}/`)
  );
  // Get page title for Amazon Proceeds QuickBooks Booking workflow pages
  const getQuickbooksBookingPageTitle = (): string => {
    if (currentPath === '/automate-accounting/quickbooks/month-end') return 'Month-End Financials';
    if (currentPath === '/quickbooks/post-month-end') return 'Post Month-End Financials';
    if (currentPath === '/automate-accounting/quickbooks/statement-decomp') return 'Post Month-End Financials';
    if (currentPath === '/automate-accounting/quickbooks/review-proceeds') return 'Review Amazon Proceeds';
    return 'Amazon ProceedsQuickBooks Booking Workflow';
  };
  
  // Evaluate Performance dashboard main pages
  const EvaluatePerformanceDashboardsMainPaths = [
    '/evaluate-performance/financial-overview',
    '/evaluate-performance/cost',
    '/evaluate-performance/cost/cogs',
    '/evaluate-performance/cost/operating-expenses',
    '/evaluate-performance/profit',
    '/evaluate-performance/pnl-report',
    '/evaluate-performance/profitability-report',
    '/evaluate-performance/operation-efficiency',
    '/evaluate-performance/business-sustainability',
    '/evaluate-performance/returns-report'
  ];
  const isEvaluatePerformanceDashboardsMainPages = EvaluatePerformanceDashboardsMainPaths.some(path => 
    currentPath === path || currentPath.startsWith(`${path}/`)
  );
  // Get page title for Evaluate Performance dashboard main pages
  const getEvaluatePerformanceDashboardPageTitle = (): string => {
    if (currentPath === '/evaluate-performance/financial-overview') return 'Financial Overview';
    if (currentPath === '/evaluate-performance/cost') return 'Cost Overview';
    if (currentPath === '/evaluate-performance/cost/cogs') return 'COGS Details';
    if (currentPath === '/evaluate-performance/cost/operating-expenses') return 'Operating Expenses Details';
    if (currentPath === '/evaluate-performance/profit') return 'Profit Overview';
    if (currentPath === '/evaluate-performance/pnl-report') return 'P&L Report';
    if (currentPath === '/evaluate-performance/profitability-report') return 'Profitability Report';
    if (currentPath === '/evaluate-performance/operation-efficiency') return 'Operation Efficiency Overview';
    if (currentPath === '/evaluate-performance/business-sustainability') return 'Business Sustainability Overview';
    if (currentPath === '/evaluate-performance/returns-report') return 'Returns Report';
    return 'Performance Evaluation';
  };

  // Elevate Strategy pages
  const ElevateStrategyPaths = [
    '/elevate-strategy/revenue-strategy',
    '/elevate-strategy/vendor-payment-strategy'
  ];
  const isElevateStrategyPages = ElevateStrategyPaths.some(path => 
    currentPath === path || currentPath.startsWith(`${path}/`)
  );
  // Get page title for Elevate Strategy pages
  const getElevateStrategyPageTitle = (): string => {
    if (currentPath === '/elevate-strategy/revenue-strategy') return 'Revenue Strategy';
    if (currentPath === '/elevate-strategy/vendor-payment-strategy') return 'Vendor Payment Strategy';
    return 'Elevate Strategy';
  };

  // Amazon BI Input pages
  const EvaluatePerformanceInputPaths = [
    '/amazon-bi-input',
    '/amazon-all-orders-pnl'
  ];
  const isEvaluatePerformanceInputPage = EvaluatePerformanceInputPaths.some(path => 
    currentPath === path || currentPath.startsWith(`${path}/`)
  );
  // Get page title for Amazon BI Input pages
  const getEvaluatePerformanceInputPageTitle = (): string => {
    if (currentPath === '/amazon-bi-input') return 'Business Operation Input';
    if (currentPath === '/amazon-all-orders-pnl') return 'All Orders PnL';
    return 'Amazon BI Input';
  };


  return (
    <Suspense fallback={<LoadingFallback />}>
      {isFullPageRoute ? (
        <Routes>
          {isHomePage && HomeComponent && <Route path="/" element={<HomeComponent />} />}
          {isAutomateAccountingPage && AutomateAccountingComponent && 
            <Route path="/automate-accounting" element={<AutomateAccountingComponent />} />
          }
          {isEvaluatePerformancePage && EvaluatePerformanceComponent && 
            <Route path="/evaluate-performance" element={<EvaluatePerformanceComponent />} />
          }
          {isElevateStrategyPage && ElevateStrategyComponent && 
            <Route path="/elevate-strategy" element={<ElevateStrategyComponent />} />
          }
        </Routes>
      ) : isCOGSWorkflowPage ? (
        // Render COGS workflow pages with the vertical stepper layout
        <COGSLayout pageTitle={getCOGSWorkFlowPageTitle()}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.component />}
              />
            ))}
          </Routes>
        </COGSLayout>
      ) : isAmazonProceedsQBBookingPage ? (
        // Render QuickBook Booking workflow pages with the QuickbookBookingLayout
        <QuickbookBookingLayout pageTitle={getQuickbooksBookingPageTitle()}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.component />}
              />
            ))}
          </Routes>
        </QuickbookBookingLayout>
      ) : isEvaluatePerformanceDashboardsMainPages ? (
        // Render Evaluate Performance dashboard pages with the DashboardLayout
        <DashboardLayout pageTitle={getEvaluatePerformanceDashboardPageTitle()}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.component />}
              />
            ))}
          </Routes>
        </DashboardLayout>
      ) : isElevateStrategyPages ? (
        // Render Elevate Strategy pages with the ElevateStrategyDashboardLayout
        <ElevateStrategyDashboardLayout pageTitle={getElevateStrategyPageTitle()}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.component />}
              />
            ))}
          </Routes>
        </ElevateStrategyDashboardLayout>
      ) : isEvaluatePerformanceInputPage ? (
        // Render Amazon BI pages with the InputLayout
        <InputLayout pageTitle={getEvaluatePerformanceInputPageTitle()}>
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.component />}
              />
            ))}
          </Routes>
        </InputLayout>
      ) : (
        // Render other pages with the original layout
        <Routes>
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<route.component />}
            />
          ))}
        </Routes>
      )}
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider 
          maxSnack={3} 
          anchorOrigin={{ 
            vertical: 'bottom', 
            horizontal: 'right' 
          }}
          autoHideDuration={5000}
        >
          <Router>
            <AppContent />
          </Router>
        </SnackbarProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default App; 