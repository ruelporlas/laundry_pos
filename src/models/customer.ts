export type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCustomerInput = {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
};

export type UpdateCustomerInput = {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
};

