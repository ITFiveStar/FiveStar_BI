export interface DeleteResponse {
  success_deletes: any[];
  failed_deletes: Array<{
    name?: string;
    purchase_order_id?: string;
    sales_record_id?: string;
    return_order_id?: string;
    SKU?: string;
    SKU_original?: string;
    SKU_new?: string;
    error: string;
    dependent_records?: any[];
  }>;
} 