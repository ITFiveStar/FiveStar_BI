export interface StockAddition {
  result_id: number;
  manufacture_order_id: number;
  manufacture_batch: number;
  SKU: string;
  product: string;
  fulfilled_by_PO: string;
  fulfilled_quantity: number;
  cost: string;
  unit_cost: string;
  manufacture_completion_date: string;
  status: string;
  quantity_left: number;
}

export interface CreateStockAdditionDto {
  SKU: string;
  fulfilled_quantity: number;
  cost: number;
  manufacture_completion_date: string | Date | null;
} 