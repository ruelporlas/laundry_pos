export type Service = {
  id: number;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateServiceInput = {
  name: string;
  description?: string;
  price: number;
};

export type UpdateServiceInput = {
  name: string;
  description?: string;
  price: number;
};