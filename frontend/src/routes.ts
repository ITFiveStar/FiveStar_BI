import { lazy } from 'react';

// Lazy load components for better performance
const Home = lazy(() => import('./pages/a_Home'));

const AutomateAccounting = lazy(() => import('./pages/b_Automate_Accounting_Section/1_Main_Page_AutomateAccounting'));

const PurchaseOrders = lazy(() => import('./pages/b_Automate_Accounting_Section/2_COGS/PurchaseOrders'));
const ManufactureOrders = lazy(() => import('./pages/b_Automate_Accounting_Section/2_COGS/ManufactureOrders'));
const StockAddition = lazy(() => import('./pages/b_Automate_Accounting_Section/2_COGS/StockAddition'));
const SalesRecords = lazy(() => import('./pages/b_Automate_Accounting_Section/2_COGS/SalesRecords'));
const ReturnsRecords = lazy(() => import('./pages/b_Automate_Accounting_Section/2_COGS/Returns'));
const ManufactureResults = lazy(() => import('./pages/b_Automate_Accounting_Section/2_COGS/ManufactureResults'));
const COGS = lazy(() => import('./pages/b_Automate_Accounting_Section/2_COGS/COGS'));
const COGSBooking = lazy(() => import('./pages/b_Automate_Accounting_Section/2_COGS/COGS_to_Quickbooks'));

const MonthEndStatement = lazy(() => import('./pages/b_Automate_Accounting_Section/3_Amazon_Proceeds_to_QuickBooks/MonthEndStatement'));
const StatementDecomp = lazy(() => import('./pages/b_Automate_Accounting_Section/3_Amazon_Proceeds_to_QuickBooks/StatementDecomp'));
const PostMonthEndStatement = lazy(() => import('./pages/b_Automate_Accounting_Section/3_Amazon_Proceeds_to_QuickBooks/PostMonthEndStatement'));

const EvaluatePerformance = lazy(() => import('./pages/c_Evaluate_Performance_Section/1_Main_Page_EvaluatePerformance'));

const FinancialOverview = lazy(() => import('./pages/c_Evaluate_Performance_Section/2_Financial_Overview'));
const COGSDetails = lazy(() => import('./pages/c_Evaluate_Performance_Section/3.1_COGS_Details'));
const OperationExpenseDetails = lazy(() => import('./pages/c_Evaluate_Performance_Section/3.2_Operating_Expense_Details'));
const PnLReport = lazy(() => import('./pages/c_Evaluate_Performance_Section/4.1_PnL_Report'));
const ProfitabilityReport = lazy(() => import('./pages/c_Evaluate_Performance_Section/4.2_Profitability_Report'));
const ReturnsReport = lazy(() => import('./pages/c_Evaluate_Performance_Section/7_Returns_Report'));

const RevenueStrategy = lazy(() => import('./pages/d_Elevate_Strategy_Section/2_Revenue_Strategy'));
const VendorPaymentStrategy = lazy(() => import('./pages/d_Elevate_Strategy_Section/3_Vendor_Payment_Strategy'));

const AmazonBIInput = lazy(() => import('./pages/c_Evaluate_Performance_Section/9_Input/AmazonBIInput'));
const AmazonAllOrdersPnL = lazy(() => import('./pages/c_Evaluate_Performance_Section/9_Input/AmazonAllOrdersPnL'));

const Inventory = lazy(() => import('./pages/Inventory'));

export const routes = [
  {path: '/', component: Home},

  {path: '/automate-accounting', component: AutomateAccounting},

  {path: '/automate-accounting/purchase-orders', component: PurchaseOrders},
  {path: '/automate-accounting/manufacture-orders', component: ManufactureOrders},
  {path: '/automate-accounting/stock-addition-exchange', component: StockAddition},
  {path: '/automate-accounting/sales-records', component: SalesRecords},
  {path: '/automate-accounting/returns-records', component: ReturnsRecords},
  {path: '/automate-accounting/manufacture-results', component: ManufactureResults},
  {path: '/automate-accounting/cogs-results', component: COGS},
  {path: '/automate-accounting/quickbooks/cogs', component: COGSBooking},

  {path: '/automate-accounting/quickbooks/month-end', component: MonthEndStatement},
  {path: '/automate-accounting/quickbooks/statement-decomp', component: StatementDecomp},
  {path: '/quickbooks/post-month-end', component: PostMonthEndStatement},

  {path: '/evaluate-performance', component: EvaluatePerformance},

  {path: '/evaluate-performance/financial-overview', component: FinancialOverview},
  {path: '/evaluate-performance/cost/cogs', component: COGSDetails},
  {path: '/evaluate-performance/cost/operating-expenses', component: OperationExpenseDetails},
  {path: '/evaluate-performance/pnl-report', component: PnLReport},
  {path: '/evaluate-performance/profitability-report', component: ProfitabilityReport},
  {path: '/evaluate-performance/returns-report', component: ReturnsReport},
  {path: '/elevate-strategy/revenue-strategy', component: RevenueStrategy},
  {path: '/elevate-strategy/vendor-payment-strategy', component: VendorPaymentStrategy},
  {path: '/amazon-bi-input', component: AmazonBIInput},
  {path: '/amazon-all-orders-pnl', component: AmazonAllOrdersPnL},

  {path: '/inventory', component: Inventory}
]; 