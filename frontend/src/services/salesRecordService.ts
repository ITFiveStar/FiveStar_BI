import { api } from './api';
import { SalesRecord, CreateSalesRecordDto, UpdateSalesRecordDto } from '../types/salesRecord';
import { DeleteResponse } from '../types/common';

// Interface for the latest sales record
interface LatestSalesRecord {
  sales_record_id: string;
  sku: string;
  sales_date: string;
  customer_name: string;
}

export const salesRecordService = {
  getAll: async () => {
    try {
      const response = await api.get<SalesRecord[]>('/sales_records');
      return response.data;
    } catch (error) {
      console.error('Error fetching sales records:', error);
      throw error;
    }
  },

  getLatest: async () => {
    try {
      const response = await api.get<LatestSalesRecord>('/sales_records/latest');
      return response.data;
    } catch (error) {
      console.error('Error fetching latest sales record:', error);
      throw error;
    }
  },

  create: async (data: CreateSalesRecordDto) => {
    const response = await api.post<SalesRecord>('/sales_records', [data]);
    return response.data;
  },

  update: async (selectedRecords: SalesRecord[], updateData: UpdateSalesRecordDto[]) => {
    const response = await api.put('/sales_records/update', {
      selected_records: selectedRecords.map(record => ({
        sales_record_id: record.sales_record_id,
        sku: record.sku
      })),
      update_data: updateData
    });
    return response.data;
  },

  delete: async (selectedRecords: SalesRecord[]) => {
    const response = await api.delete<DeleteResponse>('/sales_records/delete', {
      data: {
        selected_records: selectedRecords.map(record => ({
          sales_record_id: record.sales_record_id,
          sku: record.sku
        }))
      },
    });
    return response.data;
  },

  // Optimized bulk delete using composite keys
  bulkDelete: async (selectedRecords: SalesRecord[]) => {
    const response = await api.delete('/sales_records/bulk_delete', {
      data: {
        selected_records: selectedRecords.map(record => ({
          sales_record_id: record.sales_record_id,
          sku: record.sku
        }))
      },
    });
    return response.data;
  },

  // Delete all records
  deleteAll: async () => {
    const response = await api.delete('/sales_records/delete_all');
    return response.data;
  },
}; 