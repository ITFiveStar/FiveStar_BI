import { api } from './api';

// Interface for summary cards - Revenue, Gross Margin, Net Profit
export interface SummaryCards_Revenue_GrossMargin_NetProfit {
  latest_date: string;
  period_to_period_reference_date: string;

  revenue: number;
  revenue_paid_portion: number;
  revenue_unpaid_portion: number;
  revenue_returns_portion: number;
  revenue_sales_portion: number;
  revenue_other_portion: number;

  cogs: number;
  gross_margin: number;
  gross_margin_percentage: number;

  operating_expenses: number;
  net_profit: number;
  net_profit_percentage: number;
  operating_expenses_paid_portion: number;
  operating_expenses_unpaid_portion: number;
  operating_expenses_returns_portion: number;
  operating_expenses_non_returns_portion: number;

  revenue_last_period: number;
  revenue_period_to_period_variance_percentage: number;
  revenue_period_to_period_sign: boolean;
  
  gross_margin_last_period: number;
  gross_margin_percentage_last_period: number;
  gross_margin_period_to_period_variance_percentage: number;
  gross_margin_period_to_period_sign: boolean;
  
  net_profit_last_period: number;
  net_profit_percentage_last_period: number;
  net_profit_period_to_period_variance_percentage: number;
  net_profit_period_to_period_sign: boolean;

  last_period_revenue_exist_flag: boolean;
  last_period_gross_margin_exist_flag: boolean;
  last_period_net_profit_exist_flag: boolean;
}

const financialOverviewService = {
  // Get metrics for summary cards - Revenue, Gross Margin, Net Profit
  getSummaryCards_Revenue_GrossMargin_NetProfit: async (filters?: {
    brand?: string;
    ir?: string;
    sku?: string;
    displayMode?: string;
    dateUpTo?: Date | null;
  }): Promise<SummaryCards_Revenue_GrossMargin_NetProfit> => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.brand) params.append('brand', filters.brand);
        if (filters.ir) params.append('ir', filters.ir);
        if (filters.sku) params.append('sku', filters.sku);
        if (filters.displayMode) params.append('displayMode', filters.displayMode);
        if (filters.dateUpTo) {
          // Format date as YYYY-MM-DD
          const year = filters.dateUpTo.getFullYear();
          const month = String(filters.dateUpTo.getMonth() + 1).padStart(2, '0');
          const day = String(filters.dateUpTo.getDate()).padStart(2, '0');
          params.append('dateUpTo', `${year}-${month}-${day}`);
        }
      }
      
      // Add params to request
      const queryString = params.toString();
      const url = queryString 
        ? `/summary_revenue_gross_margin_net_profit?${queryString}` 
        : '/summary_revenue_gross_margin_net_profit';
      
      const response = await api.get<SummaryCards_Revenue_GrossMargin_NetProfit>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching summary cards data:', error);
      throw error;
    }
  },
};

export default financialOverviewService;
