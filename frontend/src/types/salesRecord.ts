export interface SalesRecord {
  sales_record_id: string;
  sales_date: string;
  sku: string;
  quantity_sold: number;
  customer_name: string;  // From the relationship with Customer
}

export interface CreateSalesRecordDto {
  sales_record_id: string;
  sales_date: string;
  sku: string;
  quantity_sold: number;
  customer_name: string;
}

export interface UpdateSalesRecordDto {
  sales_record_id?: string;
  sales_date?: string;
  sku?: string;
  quantity_sold?: number;
  customer_name?: string;
} 