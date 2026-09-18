export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateProductInput = {
  name: string;
  description?: string;
  price: number;
};

export type UpdateProductInput = {
  name: string;
  description?: string;
  price: number;
};