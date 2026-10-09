export type InventoryUnit = "piece" | "bottle" | "sachet" | "box";

export type InventoryMovementType =
  | "stock_received"
  | "sale"
  | "return"
  | "adjustment"
  | "stock_removed";

export type InventoryItem = {
  id: number;

  productId: number;

  isTrackingEnabled: boolean;

  unit: InventoryUnit;

  currentQuantity: number;

  lowStockLevel: number;

  costPerUnit: number;

  sku: string;

  supplier: string;

  createdAt: string;

  updatedAt: string;
};

export type InventoryMovement = {
  id: number;

  inventoryItemId: number;

  movementType: InventoryMovementType;

  /**
   * Signed quantity change.
   *
   * Positive = stock added
   * Negative = stock removed
   */
  quantity: number;

  /**
   * Inventory balance immediately after
   * this movement.
   */
  balanceAfter: number;

  /**
   * Cost per unit associated with this movement.
   */
  unitCost: number;

  supplier: string;

  reference: string;

  reason: string;

  notes: string;

  jobOrderId: number | null;
  jobOrderNumber: string | null;

  /**
   * ID of the user who recorded the movement.
   */
  createdBy: number | null;

  /**
   * Full name of the user who recorded the movement.
   *
   * This is resolved from the users table for display.
   */
  createdByName: string | null;

  createdAt: string;
};

export type InventoryItemWithProduct = InventoryItem & {
  productName: string;
  productDescription: string;
  productPrice: number;
  productIsActive: boolean;
};

export type UpdateInventorySettingsInput = {
  isTrackingEnabled?: boolean;
  unit?: InventoryUnit;
  lowStockLevel?: number;
  sku?: string;
  supplier?: string;
};

export type StockInInput = {
  productId: number;

  quantity: number;

  unitCost: number;

  supplier?: string;

  reference?: string;

  notes?: string;

  createdBy?: number | null;
};

export type StockOutInput = {
  productId: number;

  quantity: number;

  reason?: string;

  reference?: string;

  notes?: string;

  createdBy?: number | null;
};

export type StockAdjustmentInput = {
  productId: number;

  actualQuantity: number;

  reason: string;

  notes?: string;

  createdBy?: number | null;
};

export type StockSaleInput = {
  productId: number;

  quantity: number;

  jobOrderId?: number | null;

  reference?: string;

  notes?: string;

  createdBy?: number | null;
};

export type StockReturnInput = {
  productId: number;

  quantity: number;

  unitCost?: number;

  jobOrderId?: number | null;

  reference?: string;

  reason?: string;

  notes?: string;

  createdBy?: number | null;
};

export type InventoryOperationResult = {
  inventory: InventoryItem;

  movement: InventoryMovement;
};
