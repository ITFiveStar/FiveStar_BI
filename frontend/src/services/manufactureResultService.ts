import { api } from './api';
import { ManufactureResult, FailedManufactureResult } from '../types/manufactureResult';

// Interface for latest manufacture result
export interface LatestManufactureResult {
  manufacture_order_id: string;
  SKU: string;
  manufacture_completion_date: string;
  quantity: string;
}

// Interface for status check
export interface ManufactureResultStatus {
  all_manufacture_costs_generated: boolean;
  all_stock_exchange_generated: boolean;
}

export const manufactureResultService = {
  getAll: async () => {
    const response = await api.get<ManufactureResult[]>('/manufacture_result');
    return response.data;
  },

  getAllFailed: async () => {
    const response = await api.get<FailedManufactureResult[]>('/failed_manufacture_result');
    return response.data;
  },

  getLatest: async () => {
    try {
      const response = await api.get<LatestManufactureResult>('/manufacture_result/latest');
      return response.data;
    } catch (error) {
      console.error('Error fetching latest manufacture result:', error);
      throw error;
    }
  },

  checkStatus: async () => {
    try {
      const response = await api.get<ManufactureResultStatus>('/manufacture_result/status/check');
      return response.data;
    } catch (error) {
      console.error('Error checking manufacture result status:', error);
      throw error;
    }
  },

  deleteAll: async () => {
    // Delete COGS first
    await api.delete('/cogs/delete_all');
    await api.delete('/failed_cogs/delete_all');
    // Then delete manufacture results
    await api.delete('/manufacture_result/delete_all');
    await api.delete('/failed_manufacture_result/delete_all');
    // Then delete failed stock exchanges
    await api.delete('/failed_stock_exchange/delete_all');
  },

  generate: async () => {
    try {
      // First re-rank manufacture orders
      await api.get('/manufacture_orders/re_rank');
      
      // Then generate results
      await api.get('/manufacture_result/generate');
      
      // Get updated results
      const [results, failedResults] = await Promise.all([
        api.get<ManufactureResult[]>('/manufacture_result'),
        api.get<FailedManufactureResult[]>('/failed_manufacture_result')
      ]);

      return {
        manufactureResults: results.data,
        failedResults: failedResults.data
      };
    } catch (error) {
      console.error('Error during generation:', error);
      throw error;
    }
  },

  refreshWithStockExchange: async () => {  // new function
    try {
      // Delete all related records
      await Promise.all([
        api.delete('/cogs/delete_all'),
        api.delete('/failed_cogs/delete_all'),
        api.delete('/manufacture_result/delete_all'),
        api.delete('/failed_manufacture_result/delete_all'),
        api.delete('/failed_stock_exchange/delete_all')
      ]);

      // Re-rank manufacture orders
      await api.get('/manufacture_orders/re_rank');
      
      // Generate results
      await api.get('/manufacture_result/generate');
      
      // Update with stock exchange
      await api.get('/manufacture_result/update_with_stock_exchange');
      
      // Get updated results
      const [results, failedResults] = await Promise.all([
        api.get<ManufactureResult[]>('/manufacture_result'),
        api.get<FailedManufactureResult[]>('/failed_manufacture_result')
      ]);

      return {
        manufactureResults: results.data,
        failedResults: failedResults.data
      };
    } catch (error) {
      console.error('Error during stock exchange refresh:', error);
      throw error;
    }
  },

  filter: async (params: { [key: string]: string }) => {
    const response = await api.get<ManufactureResult[]>('/manufacture_result/filter', { params });
    return response.data;
  },

  filterFailed: async (params: { [key: string]: string }) => {
    const response = await api.get<FailedManufactureResult[]>('/failed_manufacture_result/filter', { params });
    return response.data;
  }
}; 