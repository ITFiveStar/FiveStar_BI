import axios from 'axios';
import { api } from './api';
import { AllOrdersPnL, LatestSalesRecord, LatestStatementRecord } from '../types/allOrdersPnL';

// All Orders PnL Service
const allOrdersPnLService = {
  // Get all AllOrdersPnL records
  getAllOrdersPnL: async (): Promise<AllOrdersPnL[]> => {
    const response = await api.get('/amazon/all-orders-pnl');
    return response.data.data;
  },

  // Get filtered AllOrdersPnL records with pagination
  getFilteredOrdersPnL: async (
    filters?: { 
      sales_status?: string,
      payment_status?: string,
      return_status?: string,
      product_type?: string,
      amazon_order_id?: string,
      sku?: string,
      date_from?: string,
      date_to?: string 
    },
    page: number = 1,
    per_page: number = 100
  ): Promise<{ 
    data: AllOrdersPnL[]; 
    total: number; 
    page: number; 
    per_page: number; 
    pages: number; 
  }> => {
    // Build query parameters
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value);
        }
      });
    }
    params.append('page', page.toString());
    params.append('per_page', per_page.toString());

    const response = await api.get(`/amazon/all-orders-pnl/filter?${params.toString()}`);
    return response.data;
  },

  // Generate AllOrdersPnL data
  generateAllOrdersPnL: async (): Promise<{ message: string }> => {
    const response = await api.post('/amazon/all-orders-pnl/generate');
    return response.data;
  },

  // Delete all AllOrdersPnL records
  deleteAllOrdersPnL: async (): Promise<{ message: string }> => {
    const response = await api.delete('/amazon/all-orders-pnl/delete');
    return response.data;
  },

  // Get latest sales record for display in the dashboard
  getLatestSalesRecord: async (): Promise<LatestSalesRecord> => {
    const response = await api.get<LatestSalesRecord>('/amazon/all-orders/latest');
    return response.data;
  },

  // Get latest statement record for display in the dashboard
  getLatestStatementRecord: async (): Promise<LatestStatementRecord> => {
    const response = await api.get<LatestStatementRecord>('/amazon/statements/latest');
    return response.data;
  }
};

export default allOrdersPnLService; 