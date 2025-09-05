import { api } from './api';
import { ManufactureOrder, CreateManufactureOrderDto, UpdateManufactureOrderDto } from '../types/manufactureOrder';
import { DeleteResponse } from '../types/common';
import { PurchaseOrder } from '../types/purchaseOrder';

// Interface for the latest manufacture order
interface LatestMO {
  sku: string;
  manufacture_date: string;
  manufacture_quantity: string;
}

// Interface for manufacture order status check
interface ManufactureOrderStatus {
  all_products_planned: boolean;
  missing_products: string[];
}

export const manufactureOrderService = {
  getAll: async () => {
    try {
      const response = await api.get<ManufactureOrder[]>('/manufacture_orders');
      return response.data;
    } catch (error) {
      console.error('Error fetching manufacture orders:', error);
      throw error;
    }
  },

  getLatest: async () => {
    try {
      const response = await api.get<LatestMO>('/manufacture_orders/latest');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching latest manufacture order:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw error;
    }
  },

  checkStatus: async () => {
    try {
      const response = await api.get<ManufactureOrderStatus>('/manufacture_orders/status/check');
      return response.data;
    } catch (error) {
      console.error('Error checking manufacture order status:', error);
      throw error;
    }
  },

  getProducts: async () => {
    try {
      const response = await api.get<PurchaseOrder[]>('/purchase_orders');
      const uniqueProducts = Array.from(new Set(response.data.map(po => po.product)));
      return uniqueProducts.sort();
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  create: async (data: CreateManufactureOrderDto) => {
    const response = await api.post<ManufactureOrder>('/manufacture_orders', [data]);
    return response.data;
  },

  update: async (selectedRecords: ManufactureOrder[], updateData: UpdateManufactureOrderDto[]) => {
    const response = await api.put('/manufacture_orders/update', {
      selected_records: selectedRecords.map(record => ({
        id: record.id,
        sku: record.sku,
        manufacture_date: record.manufacture_date,
        product: record.product
      })),
      update_data: updateData
    });
    return response.data;
  },

  delete: async (selectedRecords: ManufactureOrder[]) => {
    const response = await api.delete<DeleteResponse>('/manufacture_orders/delete', {
      data: {
        selected_records: selectedRecords.map(record => ({
          id: record.id,
          sku: record.sku,
          manufacture_date: record.manufacture_date,
          product: record.product
        }))
      },
    });
    return response.data;
  },

  // Optimized bulk delete using record IDs
  bulkDelete: async (selectedRecords: ManufactureOrder[]) => {
    const recordIds = selectedRecords.map(record => record.id);
    const response = await api.delete('/manufacture_orders/bulk_delete', {
      data: {
        record_ids: recordIds
      },
    });
    return response.data;
  },

  // Delete all records
  deleteAll: async () => {
    const response = await api.delete('/manufacture_orders/delete_all');
    return response.data;
  },
}; 