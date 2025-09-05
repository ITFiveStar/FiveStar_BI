export interface Return {
  return_order_id: string;
  SKU: string;
  return_date: string;
  return_quantity: number;
  return_unit_price: string;
  supplier_name: string;
  total_cost: string;
  return_currency: string;
  target_currency: string;
  fx_rate: string;
  quantity_left: number;
}

export interface CreateReturnDto {
  return_order_id: string;
  SKU: string;
  return_date: string;
  return_quantity: number;
  return_unit_price: string;
  supplier_name: string;
  return_currency: string;
  target_currency: string;
  fx_rate: string;
}

export interface UpdateReturnDto {
  return_order_id?: string;
  SKU?: string;
  return_date?: string;
  return_quantity?: number;
  return_unit_price?: string;
  supplier_name?: string;
  return_currency?: string;
  target_currency?: string;
  fx_rate?: string;
} 