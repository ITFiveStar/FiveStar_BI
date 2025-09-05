export interface PurchaseOrder {
  purchase_order_id: string;
  supplier_name: string;  // From the relationship with Supplier
  order_date: string;
  product: string;
  purchase_quantity: number;
  purchase_unit_price: string;  // Using string for decimal numbers
  total_cost: string;
  purchase_currency: string;
  target_currency: string;
  fx_rate: string;
  quantity_left: number;
}

export interface CreatePurchaseOrderDto {
  purchase_order_id: string;
  supplier_name: string;
  order_date: string;
  product: string;
  purchase_quantity: number;
  purchase_unit_price: string;
  purchase_currency: string;
  target_currency: string;
  fx_rate: string;
}

export interface UpdatePurchaseOrderDto {
  purchase_order_id?: string;
  supplier_name?: string;
  order_date?: string;
  product?: string;
  purchase_quantity?: number;
  purchase_unit_price?: string;
  purchase_currency?: string;
  target_currency?: string;
  fx_rate?: string;
} 