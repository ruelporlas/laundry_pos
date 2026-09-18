export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const customers: Customer[] = [
  {
    id: '1',
    name: 'Juan Dela Cruz',
    phone: '0917 123 4567',
    address: '',
    notes: '',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Maria Santos',
    phone: '0918 555 1234',
    address: '',
    notes: '',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Pedro Garcia',
    phone: '0919 222 3344',
    address: '',
    notes: '',
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];