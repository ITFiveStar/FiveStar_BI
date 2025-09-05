import { api } from './api';
import { COGS, FailedCOGS } from '../types/cogs';

// Interface for the latest COGS record
interface LatestCOGS {
  sales_date: string;
  sales_record_id: string;
  customer_name: string;
  SKU: string;
  cogs_value: string;
}

// Interface for COGS status
interface COGSStatus {
  all_cogs_generated: boolean;
}

export const cogsService = {
  getAll: async () => {
    const response = await api.get<COGS[]>('/cogs');
    return response.data;
  },

  getAllFailed: async () => {
    const response = await api.get<FailedCOGS[]>('/failed_cogs');
    return response.data;
  },

  getLatest: async () => {
    try {
      const response = await api.get<LatestCOGS>('/cogs/latest');
      return response.data;
    } catch (error) {
      console.error('Error fetching latest COGS record:', error);
      throw error;
    }
  },

  checkStatus: async () => {
    try {
      const response = await api.get<COGSStatus>('/cogs/status/check');
      return response.data;
    } catch (error) {
      console.error('Error checking COGS status:', error);
      throw error;
    }
  },

  deleteAll: async () => {
    // Delete COGS first
    await api.delete('/cogs/delete_all');
    // Then delete failed COGS
    await api.delete('/failed_cogs/delete_all');
  },

  refresh: async () => {
    try {
      // Generate new COGS
      await Promise.all([
        api.delete('/cogs/delete_all'),
        api.delete('/failed_cogs/delete_all'),
        api.delete('/manufacture_result/delete_all'),
        api.delete('/failed_manufacture_result/delete_all'),
        api.delete('/failed_stock_exchange/delete_all')
      ]);
      
      await api.get('/manufacture_orders/re_rank');
      await api.get('/manufacture_result/generate');
      await api.get('/manufacture_result/update_with_stock_exchange');
      await api.get('/cogs/generate');
      
      // Get updated results
      const [cogs, failedCogs] = await Promise.all([
        api.get<COGS[]>('/cogs'),
        api.get<FailedCOGS[]>('/failed_cogs')
      ]);

      return {
        cogs: cogs.data,
        failedCogs: failedCogs.data
      };
    } catch (error) {
      console.error('Error during refresh:', error);
      throw error;
    }
  },

  filter: async (params: { [key: string]: string }) => {
    const response = await api.get<COGS[]>('/cogs/filter', { params });
    return response.data;
  },

  filterFailed: async (params: { [key: string]: string }) => {
    const response = await api.get<FailedCOGS[]>('/failed_cogs/filter', { params });
    return response.data;
  }
}; 