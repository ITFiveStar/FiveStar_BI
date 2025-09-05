export interface COGS {
    id: number;
    sales_record_id: string;
    sales_date: string;
    SKU: string;
    quantity_sold: number;
    result_id: number;
    manufacture_batch: number;
    product: string;
    fulfilled_by_PO: string;
    COGS: string;
}

export interface FailedCOGS {
    id: number;
    sales_record_id: string;
    sales_date: string;
    SKU: string;
    quantity_sold: number;
    failed_quantity: number;
    failure_reason: string;
} 