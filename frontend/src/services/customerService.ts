import { api } from './api';
import { Customer, CreateCustomerDto } from '../types/customer';
import { DeleteResponse } from '../types/common';

export const customerService = {
  getAll: async () => {
    const response = await api.get<Customer[]>('/customers');
    return response.data;
  },

  getByName: async (name: string) => {
    const response = await api.get<Customer[]>(`/customers/name/${name}`);
    return response.data;
  },

  create: async (data: CreateCustomerDto | CreateCustomerDto[]) => {
    const response = await api.post<{ message: string; customers?: Customer[]; customer?: Customer }>('/customers', data);
    return response.data;
  },

  update: async (selectedRecords: Customer[], updateData: { name: string }[]) => {
    const selectedNames = selectedRecords.map(record => ({ name: record.name }));
    
    const response = await api.put('/customers/update', {
      selected_records: selectedNames,
      update_data: updateData
    });
    return response.data;
  },

  delete: async (selectedRecords: Customer[]) => {
    const selectedNames = selectedRecords.map(record => ({ name: record.name }));
    
    const response = await api.delete<DeleteResponse>('/customers/delete', {
      data: { selected_records: selectedNames },
    });
    return response.data;
  },
}; 