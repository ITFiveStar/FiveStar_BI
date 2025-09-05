export interface ManufactureResult {
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
  status: 'COMPLETED' | 'FAILED';
  quantity_left: number;
}

export interface FailedManufactureResult {
  id: number;
  manufacture_order_id: number;
  SKU: string;
  product: string;
  manufacture_date: string;
  failure_reason: string;
} 