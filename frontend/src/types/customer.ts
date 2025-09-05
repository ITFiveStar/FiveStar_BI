export interface Customer {
  customer_id: number;
  name: string;
}

export interface CreateCustomerDto {
  name: string;
}

export interface UpdateCustomerDto {
  name: string;
} 