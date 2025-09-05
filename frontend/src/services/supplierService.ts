import { api } from './api';
import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../types/supplier';
import { DeleteResponse } from '../types/common';

export const supplierService = {
  getAll: async () => {
    const response = await api.get<Supplier[]>('/suppliers');
    return response.data;
  },

  getByName: async (name: string) => {
    const response = await api.get<Supplier[]>(`/suppliers/name/${name}`);
    return response.data;
  },

  create: async (data: CreateSupplierDto | CreateSupplierDto[]) => {
    const response = await api.post<{ message: string; suppliers?: Supplier[]; supplier?: Supplier }>('/suppliers', data);
    return response.data;
  },

  update: async (selectedRecords: Supplier[], updateData: { name: string }[]) => {
    const selectedNames = selectedRecords.map(record => ({ name: record.name }));
    
    const response = await api.put('/suppliers/update', {
      selected_records: selectedNames,
      update_data: updateData
    });
    return response.data;
  },

  delete: async (selectedRecords: Supplier[]) => {
    const selectedNames = selectedRecords.map(record => ({ name: record.name }));
    
    const response = await api.delete<DeleteResponse>('/suppliers/delete', {
      data: { selected_records: selectedNames },
    });
    return response.data;
  },
}; 