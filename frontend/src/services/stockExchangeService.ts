import { api } from './api';
import { StockExchange, CreateStockExchangeDto, FailedStockExchange } from '../types/stockExchange';
import { DeleteResponse } from '../types/common';
import axios from 'axios';

// Interface for the latest stock exchange
interface LatestStockExchange {
  SKU_original: string;
  SKU_new: string;
  quantity: string;
  exchange_date: string;
}

export const stockExchangeService = {
  getAll: async (): Promise<StockExchange[]> => {
    const response = await api.get('/stock_exchange');
    return response.data;
  },

  getLatest: async (): Promise<LatestStockExchange> => {
    try {
      const response = await api.get<LatestStockExchange>('/stock_exchange/latest');
      return response.data;
    } catch (error) {
      console.error('Error fetching latest stock exchange:', error);
      throw error;
    }
  },

  create: async (data: CreateStockExchangeDto): Promise<StockExchange> => {
    const response = await api.post('/stock_exchange', data);
    return response.data;
  },

  bulkUpload: async (data: CreateStockExchangeDto[]): Promise<StockExchange[]> => {
    const response = await api.post('/stock_exchange', data);
    return response.data.exchanges;
  },

  delete: async (selected: StockExchange[]): Promise<DeleteResponse> => {
    const response = await api.delete('/stock_exchange/delete', {
      data: {
        selected_records: selected.map(record => ({
          id: record.id,
          SKU_original: record.SKU_original,
          SKU_new: record.SKU_new,
          quantity: record.quantity,
          exchange_date: record.exchange_date
        }))
      }
    });
    return response.data;
  },

  filter: async (params: { SKU_original?: string; SKU_new?: string; exchange_date?: string }): Promise<StockExchange[]> => {
    const response = await api.get('/stock_exchange/filter', { params });
    return response.data;
  },

  getAllFailed: async (): Promise<FailedStockExchange[]> => {
    const response = await axios.get('/failed_stock_exchange');
    return response.data;
  }
}; 