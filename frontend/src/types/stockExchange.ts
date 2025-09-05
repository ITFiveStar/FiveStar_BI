export interface StockExchange {
    id: number;
    SKU_original: string;
    SKU_new: string;
    quantity: number;
    exchange_date: string;
}

export interface FailedStockExchange {
    id: number;
    SKU_original: string;
    SKU_new: string;
    quantity: number;
    exchange_date: string;
}

export interface CreateStockExchangeDto {
    SKU_original: string;
    SKU_new: string;
    quantity: number;
    exchange_date: string | Date | null;
} 