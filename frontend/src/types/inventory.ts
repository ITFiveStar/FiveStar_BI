export interface Inventory {
    id: number;
    SKU: string;
    as_of_date: string;
    manufactured_total_quantity: number;
    in_stock_quantity: number;
    inventory_value: number;
}

export interface InventoryRawMaterial {
    Product: string;
    as_of_date: string;
    purchased_total_quantity: number;
    in_stock_quantity: number;
    inventory_value: number;
} 