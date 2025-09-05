export interface ManufactureOrder {
  id: number;
  manufacture_order_id: number;
  sku: string;
  product: string;
  manufacture_quantity: number;
  manufacture_date: string;
}

export interface CreateManufactureOrderDto {
  sku: string;
  product: string;
  manufacture_quantity: number;
  manufacture_date: string;
}

export interface UpdateManufactureOrderDto {
  sku?: string;
  product?: string;
  manufacture_quantity?: number;
  manufacture_date?: string;
} 