import { api } from './api';
import { Return, CreateReturnDto, UpdateReturnDto } from '../types/return';
import { DeleteResponse } from '../types/common';

// Interface for the latest return record
export interface LatestReturn {
  return_order_id: string;
  SKU: string;
  return_date: string;
  supplier_name: string;
}

export const returnService = {
  getAll: async () => {
    try {
      const response = await api.get<Return[]>('/returns');
      return response.data;
    } catch (error) {
      console.error('Error fetching returns:', error);
      throw error;
    }
  },

  getLatest: async () => {
    try {
      const response = await api.get<LatestReturn>('/returns/latest');
      return response.data;
    } catch (error) {
      console.error('Error fetching latest return:', error);
      throw error;
    }
  },

  create: async (data: CreateReturnDto) => {
    const response = await api.post<Return>('/returns', [data]);
    return response.data;
  },

  update: async (selectedRecords: Return[], updateData: UpdateReturnDto[]) => {
    const response = await api.put('/returns/update', {
      selected_records: selectedRecords.map(record => ({
        return_order_id: record.return_order_id,
        SKU: record.SKU,
        return_date: record.return_date
      })),
      update_data: updateData
    });
    return response.data;
  },

  delete: async (selectedRecords: Return[]) => {
    const response = await api.delete<DeleteResponse>('/returns/delete', {
      data: {
        selected_records: selectedRecords.map(record => ({
          return_order_id: record.return_order_id,
          SKU: record.SKU,
          return_date: record.return_date
        }))
      },
    });
    return response.data;
  },
}; 