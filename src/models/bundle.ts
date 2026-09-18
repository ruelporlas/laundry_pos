export type BundleItemType = "product" | "service";

export type BundleItem = {
  id: number;
  bundleId: number;
  itemType: BundleItemType;
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
};

export type Bundle = {
  id: number;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  items: BundleItem[];
  createdAt: string;
  updatedAt: string;
};

export type CreateBundleItemInput = {
  itemType: BundleItemType;
  itemId: number;
  quantity: number;
};

export type CreateBundleInput = {
  name: string;
  description?: string;
  price: number;
  items: CreateBundleItemInput[];
};

export type UpdateBundleInput = {
  name: string;
  description?: string;
  price: number;
  items: CreateBundleItemInput[];
};