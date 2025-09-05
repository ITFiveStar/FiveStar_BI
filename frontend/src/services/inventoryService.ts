import { api } from './api';
import { Inventory, InventoryRawMaterial } from '../types/inventory';

export const inventoryService = {
  getAll: async () => {
    const [inventoryResponse, rawMaterialResponse] = await Promise.all([
      api.get<Inventory[]>('/inventory'),
      api.get<InventoryRawMaterial[]>('/inventory_raw_material')
    ]);
    
    return {
      inventory: inventoryResponse.data,
      rawMaterial: rawMaterialResponse.data
    };
  },

  deleteAll: async () => {
    await Promise.all([
      api.delete('/inventory/delete_all'),
      api.delete('/inventory_raw_material/delete_all')
    ]);
  },

  refresh: async () => {
    // Generate new inventory without date for both tables
    await api.get('/inventory/generate');
    await api.get('/inventory_raw_material/generate');

    // Regenerate latest Manufacture Results, Stock Exchange, and COGS
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
    const [inventoryResponse, rawMaterialResponse] = await Promise.all([
      api.get<Inventory[]>('/inventory'),
      api.get<InventoryRawMaterial[]>('/inventory_raw_material')
    ]);
    
    return {
      inventory: inventoryResponse.data,
      rawMaterial: rawMaterialResponse.data
    };
  },

  generateAsOf: async (date: string) => {

    // Generate inventory as of date for both tables
    await api.get(`/inventory/generate?date=${date}`);
    await api.get(`/inventory_raw_material/generate?date=${date}`);
    
    // Regenerate latest Manufacture Results, Stock Exchange, and COGS
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
    
    // Get filtered results
    const [inventoryResponse, rawMaterialResponse] = await Promise.all([
      api.get<Inventory[]>(`/inventory/filter?as_of_date=${date}`),
      api.get<InventoryRawMaterial[]>(`/inventory_raw_material/filter?as_of_date=${date}`)
    ]);
    
    return {
      inventory: inventoryResponse.data,
      rawMaterial: rawMaterialResponse.data
    };
  },

  filter: async (params: { [key: string]: string }) => {
    const [inventoryResponse, rawMaterialResponse] = await Promise.all([
      api.get<Inventory[]>('/inventory/filter', { params }),
      api.get<InventoryRawMaterial[]>('/inventory_raw_material/filter', { params })
    ]);
    
    return {
      inventory: inventoryResponse.data,
      rawMaterial: rawMaterialResponse.data
    };
  }
}; 