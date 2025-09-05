import { api } from './api';
import { PurchaseOrder, CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '../types/purchaseOrder';
import { DeleteResponse } from '../types/common';

// Interface for latest PO record
interface LatestPO {
  purchase_order_id: string;
  order_date: string;
  supplier_name: string;
  total_cost: string;
}

export const purchaseOrderService = {
  getAll: async () => {
    try {
      console.log('Fetching purchase orders...');
      const response = await api.get<PurchaseOrder[]>('/purchase_orders');
      console.log('Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    const response = await api.get<PurchaseOrder>(`/purchase_orders/${id}`);
    return response.data;
  },
  
  getLatest: async () => {
    try {
      const response = await api.get<LatestPO>('/purchase_orders/latest');
      return response.data;
    } catch (error) {
      console.error('Error fetching latest purchase order:', error);
      throw error;
    }
  },

  create: async (data: CreatePurchaseOrderDto) => {
    const response = await api.post<PurchaseOrder>('/purchase_orders', data);
    return response.data;
  },

  update: async (selectedRecords: PurchaseOrder[], updateData: UpdatePurchaseOrderDto[]) => {
    const response = await api.put('/purchase_orders/update', {
      selected_records: selectedRecords.map(record => ({
        purchase_order_id: record.purchase_order_id,
        product: record.product
      })),
      update_data: updateData
    });
    return response.data;
  },

  delete: async (selectedRecords: PurchaseOrder[]) => {
    const response = await api.delete<DeleteResponse>('/purchase_orders/delete', {
      data: {
        selected_records: selectedRecords.map(record => ({
          purchase_order_id: record.purchase_order_id,
          product: record.product
        }))
      },
    });
    return response.data;
  },

  // Optimized bulk delete using composite keys
  bulkDelete: async (selectedRecords: PurchaseOrder[]) => {
    const response = await api.delete('/purchase_orders/bulk_delete', {
      data: {
        selected_records: selectedRecords.map(record => ({
          purchase_order_id: record.purchase_order_id,
          product: record.product
        }))
      },
    });
    return response.data;
  },

  // Delete all records
  deleteAll: async () => {
    const response = await api.delete('/purchase_orders/delete_all');
    return response.data;
  },
}; 