import axios from 'axios';
import { api } from './api';
import { 
  AmazonOrder, 
  SKUEconomics, 
  AmazonInboundShipping, 
  AmazonStatement,
  FBMShippingCost,
  AdsSpendByDay,
  AdsCreditCardPayment,
  QBAccountIDMapping
} from '../types/amazonBI';

// Define interfaces for latest record types
export interface LatestAmazonOrder {
  amazon_order_id: string;
  purchase_date_pst_pdt: string;
}

export interface LatestSKUEconomics {
  start_date_pst_pdt: string;
  end_date_pst_pdt: string;
}

export interface LatestInboundShipping {
  shipment_id: string;
  created_pst_pdt: string;
}

export interface LatestStatement {
  settlement_id: string;
  settlement_start_date_pst_pdt: string;
  settlement_end_date_pst_pdt: string;
  total_amount: string;
}

export interface LatestFBMShippingCost {
  shipping_id: string;
  payment_date: string;
}

export interface LatestAdsSpendByDay {
  date_by_day: string;
  sku: string;
}

export interface LatestAdsCreditCardPayment {
  invoice_id: string;
  issued_on: string;
}

// Amazon BI Service
const amazonBIService = {
  // ORDERS CRUD
  getAllOrders: async (): Promise<AmazonOrder[]> => {
    const response = await api.get('/amazon/all-orders');
    return response.data;
  },

  getOrderById: async (id: number): Promise<AmazonOrder | null> => {
    const response = await api.get(`/amazon/all-orders/${id}`);
    return response.data;
  },

  createOrders: async (orders: Partial<AmazonOrder>[]): Promise<AmazonOrder[]> => {
    const response = await api.post('/amazon/all-orders/bulk-create', orders);
    return response.data;
  },

  deleteOrders: async (orderIds: { id: number }[]): Promise<{ success: boolean, message: string }> => {
    const response = await api.delete('/amazon/all-orders/delete', { 
      data: { 
        selected_records: orderIds 
      }
    });
    return response.data;
  },

  deleteAllOrders: async (): Promise<{ message: string }> => {
    const response = await api.delete('/amazon/all-orders/delete-all');
    return response.data;
  },
  
  getLatestOrder: async (): Promise<LatestAmazonOrder> => {
    const response = await api.get<LatestAmazonOrder>('/amazon/all-orders/latest');
    return response.data;
  },

  // SKU ECONOMICS CRUD
  getAllSKUEconomics: async (): Promise<SKUEconomics[]> => {
    const response = await api.get('/amazon/sku-economics');
    return response.data;
  },

  getSKUEconomicsById: async (id: number): Promise<SKUEconomics | null> => {
    const response = await api.get(`/amazon/sku-economics/${id}`);
    return response.data;
  },

  createSKUEconomics: async (skuEconomics: Partial<SKUEconomics>[]): Promise<SKUEconomics[]> => {
    const response = await api.post('/amazon/sku-economics/bulk-create', skuEconomics);
    return response.data;
  },

  deleteSKUEconomics: async (skuEconomicsIds: { id: number }[]): Promise<{ success: boolean, message: string }> => {
    const response = await api.delete('/amazon/sku-economics/delete', { 
      data: { 
        selected_records: skuEconomicsIds 
      }
    });
    return response.data;
  },

  deleteAllSKUEconomics: async (): Promise<{ message: string }> => {
    const response = await api.delete('/amazon/sku-economics/delete-all');
    return response.data;
  },
  
  getLatestSKUEconomics: async (): Promise<LatestSKUEconomics> => {
    const response = await api.get<LatestSKUEconomics>('/amazon/sku-economics/latest');
    return response.data;
  },

  // INBOUND SHIPPING CRUD
  getAllInboundShipping: async (): Promise<AmazonInboundShipping[]> => {
    const response = await api.get('/amazon/inbound-shipping');
    return response.data;
  },

  getInboundShippingById: async (id: number): Promise<AmazonInboundShipping | null> => {
    const response = await api.get(`/amazon/inbound-shipping/${id}`);
    return response.data;
  },

  createInboundShipping: async (inboundShipping: Partial<AmazonInboundShipping>[]): Promise<AmazonInboundShipping[]> => {
    const response = await api.post('/amazon/inbound-shipping/bulk-create', inboundShipping);
    return response.data;
  },

  deleteInboundShipping: async (inboundShippingIds: { id: number }[]): Promise<{ success: boolean, message: string }> => {
    const response = await api.delete('/amazon/inbound-shipping/delete', { 
      data: { 
        selected_records: inboundShippingIds 
      }
    });
    return response.data;
  },

  deleteAllInboundShipping: async (): Promise<{ message: string }> => {
    const response = await api.delete('/amazon/inbound-shipping/delete-all');
    return response.data;
  },
  
  getLatestInboundShipping: async (): Promise<LatestInboundShipping> => {
    const response = await api.get<LatestInboundShipping>('/amazon/inbound-shipping/latest');
    return response.data;
  },

  // STATEMENTS CRUD
  getAllStatements: async (): Promise<AmazonStatement[]> => {
    const response = await api.get('/amazon/statements');
    return response.data;
  },

  getStatementById: async (id: number): Promise<AmazonStatement | null> => {
    const response = await api.get(`/amazon/statements/${id}`);
    return response.data;
  },

  createStatements: async (statements: Partial<AmazonStatement>[]): Promise<AmazonStatement[]> => {
    const response = await api.post('/amazon/statements/bulk-create', statements);
    return response.data;
  },

  deleteStatements: async (statementIds: { id: number }[]): Promise<{ success: boolean, message: string }> => {
    const response = await api.delete('/amazon/statements/delete', { 
      data: { 
        selected_records: statementIds 
      }
    });
    return response.data;
  },

  deleteAllStatements: async (): Promise<{ message: string }> => {
    const response = await api.delete('/amazon/statements/delete-all');
    return response.data;
  },
  
  getLatestStatement: async (): Promise<LatestStatement> => {
    const response = await api.get<LatestStatement>('/amazon/statements/latest');
    return response.data;
  },
  
  // FBM SHIPPING COST CRUD
  getAllFBMShippingCost: async (): Promise<FBMShippingCost[]> => {
    const response = await api.get('/amazon/fbm-shipping-cost');
    return response.data;
  },

  createFBMShippingCost: async (fbmShippingCost: Partial<FBMShippingCost>[]): Promise<FBMShippingCost[]> => {
    const response = await api.post('/amazon/fbm-shipping-cost/bulk-create', fbmShippingCost);
    return response.data;
  },

  deleteFBMShippingCost: async (fbmShippingCostIds: { id: number }[]): Promise<{ success: boolean, message: string }> => {
    const response = await api.delete('/amazon/fbm-shipping-cost/delete', { 
      data: { 
        selected_records: fbmShippingCostIds 
      }
    });
    return response.data;
  },

  deleteAllFBMShippingCost: async (): Promise<{ message: string }> => {
    const response = await api.delete('/amazon/fbm-shipping-cost/delete-all');
    return response.data;
  },
  
  // AD SPEND BY DAY CRUD
  getAllAdsSpendByDay: async (): Promise<AdsSpendByDay[]> => {
    const response = await api.get('/amazon/ads-spend-by-day');
    return response.data;
  },

  createAdsSpendByDay: async (adsSpendByDay: Partial<AdsSpendByDay>[]): Promise<AdsSpendByDay[]> => {
    const response = await api.post('/amazon/ads-spend-by-day/bulk-create', adsSpendByDay);
    return response.data;
  },

  deleteAdsSpendByDay: async (adsSpendByDayIds: { id: number }[]): Promise<{ success: boolean, message: string }> => {
    const response = await api.delete('/amazon/ads-spend-by-day/delete', { 
      data: { 
        selected_records: adsSpendByDayIds 
      }
    });
    return response.data;
  },

  deleteAllAdsSpendByDay: async (): Promise<{ message: string }> => {
    const response = await api.delete('/amazon/ads-spend-by-day/delete-all');
    return response.data;
  },
  
  getLatestAdsSpendByDay: async (): Promise<LatestAdsSpendByDay> => {
    const response = await api.get<LatestAdsSpendByDay>('/amazon/ads-spend-by-day/latest');
    return response.data;
  },
  
  // AD CREDIT CARD PAYMENT CRUD
  getAllAdsCreditCardPayment: async (): Promise<AdsCreditCardPayment[]> => {
    const response = await api.get('/amazon/ads-credit-card-payment');
    return response.data;
  },

  createAdsCreditCardPayment: async (adsCreditCardPayment: Partial<AdsCreditCardPayment>[]): Promise<AdsCreditCardPayment[]> => {
    const response = await api.post('/amazon/ads-credit-card-payment/bulk-create', adsCreditCardPayment);
    return response.data;
  },

  deleteAdsCreditCardPayment: async (adsCreditCardPaymentIds: { id: number }[]): Promise<{ success: boolean, message: string }> => {
    const response = await api.delete('/amazon/ads-credit-card-payment/delete', { 
      data: { 
        selected_records: adsCreditCardPaymentIds 
      }
    });
    return response.data;
  },

  deleteAllAdsCreditCardPayment: async (): Promise<{ message: string }> => {
    const response = await api.delete('/amazon/ads-credit-card-payment/delete-all');
    return response.data;
  },
  
  getLatestAdsCreditCardPayment: async (): Promise<LatestAdsCreditCardPayment> => {
    const response = await api.get<LatestAdsCreditCardPayment>('/amazon/ads-credit-card-payment/latest');
    return response.data;
  },
  
  // Generic bulk create method for any Amazon BI data
  bulkCreate: async (endpoint: string, data: any[]): Promise<any> => {
    const response = await api.post(endpoint, data);
    return response.data;
  },

  // QB Account Mapping CRUD operations
  getAllQBAccountMapping: async (): Promise<QBAccountIDMapping[]> => {
    const response = await api.get('/qb-account-mapping');
    return response.data;
  },

  createQBAccountMapping: async (data: QBAccountIDMapping[]): Promise<{ message: string }> => {
    const response = await api.post('/qb-account-mapping/bulk-create', data);
    return response.data;
  },

  deleteQBAccountMapping: async (selectedRecords: { id: number }[]): Promise<{ success_deletes: any[], failed_deletes: any[] }> => {
    const response = await api.delete('/qb-account-mapping/delete', {
      data: { selected_records: selectedRecords }
    });
    return response.data;
  },

  deleteAllQBAccountMapping: async (): Promise<{ message: string }> => {
    const response = await api.delete('/qb-account-mapping/delete-all');
    return response.data;
  },

  getLatestQBAccountMapping: async (): Promise<{ statement_category: string; statement_pnl_items: string }> => {
    const response = await api.get('/qb-account-mapping/latest');
    return response.data;
  }
};

export default amazonBIService; 