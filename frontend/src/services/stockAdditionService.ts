import { api } from './api';
import { StockAddition, CreateStockAdditionDto } from '../types/stockAddition';
import { DeleteResponse } from '../types/common';

// Interface for the latest stock addition
interface LatestStockAddition {
  SKU: string;
  manufacture_completion_date: string;
  fulfilled_quantity: string;
  cost: string;
}

export const stockAdditionService = {
  getAll: async (): Promise<StockAddition[]> => {
    const response = await api.get('/stock_initiation_addition');
    return response.data;
  },

  getLatest: async (): Promise<LatestStockAddition> => {
    try {
      const response = await api.get<LatestStockAddition>('/stock_initiation_addition/latest');
      return response.data;
    } catch (error) {
      console.error('Error fetching latest stock addition:', error);
      throw error;
    }
  },

  create: async (data: CreateStockAdditionDto): Promise<StockAddition> => {
    const response = await api.post('/stock_initiation_addition', data);
    return response.data;
  },

  bulkUpload: async (data: CreateStockAdditionDto[]): Promise<StockAddition[]> => {
    const response = await api.post('/stock_initiation_addition', data);
    return response.data.stock;
  },

  delete: async (selected: StockAddition[]): Promise<DeleteResponse> => {
    const response = await api.delete('/stock_initiation_addition/delete', {
      data: {
        selected_records: selected.map(record => ({
          result_id: record.result_id,
          SKU: record.SKU,
          fulfilled_quantity: record.fulfilled_quantity,
          cost: record.cost,
          manufacture_completion_date: record.manufacture_completion_date
        }))
      }
    });
    return response.data;
  },

  filter: async (params: { SKU?: string; manufacture_completion_date?: string }): Promise<StockAddition[]> => {
    const response = await api.get('/stock_initiation_addition/filter', { params });
    return response.data;
  }
}; 