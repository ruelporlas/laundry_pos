import { getDatabase } from "@/database";
import { doAction } from "@/hooks/actions";
import {
    InventoryItem,
    InventoryItemWithProduct,
    InventoryMovement,
    InventoryMovementType,
    InventoryOperationResult,
    InventoryUnit,
    StockAdjustmentInput,
    StockInInput,
    StockOutInput,
    StockReturnInput,
    StockSaleInput,
    UpdateInventorySettingsInput,
} from "@/models/inventory";

type Database = Awaited<ReturnType<typeof getDatabase>>;

type InventoryItemRow = {
  id: number;
  product_id: number;
  is_tracking_enabled: number;
  unit: string;
  current_quantity: number;
  low_stock_level: number;
  cost_per_unit: number;
  sku: string;
  supplier: string;
  created_at: string;
  updated_at: string;
};

type InventoryItemWithProductRow = InventoryItemRow & {
  product_name: string;
  product_description: string;
  product_price: number;
  product_is_active: number;
};

type InventoryMovementRow = {
  id: number;
  inventory_item_id: number;
  movement_type: string;
  quantity: number;
  balance_after: number;
  unit_cost: number;
  supplier: string;
  reference: string;
  reason: string;
  notes: string;
  job_order_id: number | null;
  job_order_number: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
};

export type InventorySaleRequirement = {
  productId: number;
  quantity: number;
  jobOrderId?: number | null;
  reference?: string;
  notes?: string;
  createdBy?: number | null;
};

function mapInventoryItem(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
    productId: row.product_id,
    isTrackingEnabled: Boolean(row.is_tracking_enabled),
    unit: normalizeInventoryUnit(row.unit),
    currentQuantity: row.current_quantity,
    lowStockLevel: row.low_stock_level,
    costPerUnit: row.cost_per_unit,
    sku: row.sku,
    supplier: row.supplier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInventoryItemWithProduct(
  row: InventoryItemWithProductRow,
): InventoryItemWithProduct {
  return {
    ...mapInventoryItem(row),
    productName: row.product_name,
    productDescription: row.product_description,
    productPrice: row.product_price,
    productIsActive: Boolean(row.product_is_active),
  };
}

function mapInventoryMovement(row: InventoryMovementRow): InventoryMovement {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    movementType: normalizeMovementType(row.movement_type),
    quantity: row.quantity,
    balanceAfter: row.balance_after,
    unitCost: row.unit_cost,
    supplier: row.supplier,
    reference: row.reference,
    reason: row.reason,
    notes: row.notes,
    jobOrderId: row.job_order_id,
    jobOrderNumber: row.job_order_number,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  };
}

function normalizeInventoryUnit(value: string): InventoryUnit {
  switch (value) {
    case "bottle":
      return "bottle";

    case "sachet":
      return "sachet";

    case "box":
      return "box";

    case "piece":
    default:
      return "piece";
  }
}

function normalizeMovementType(value: string): InventoryMovementType {
  switch (value) {
    case "stock_received":
      return "stock_received";

    case "sale":
      return "sale";

    case "return":
      return "return";

    case "adjustment":
      return "adjustment";

    case "stock_removed":
      return "stock_removed";

    default:
      throw new Error(`Unknown inventory movement type: ${value}`);
  }
}

function normalizeText(value?: string): string {
  return value?.trim() ?? "";
}

function validatePositiveQuantity(quantity: number, label = "Quantity"): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

function validateNonNegativeNumber(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} cannot be negative.`);
  }
}

async function getInventoryItemById(
  inventoryItemId: number,
): Promise<InventoryItem | null> {
  const db = await getDatabase();

  return getInventoryItemByIdWithDb(db, inventoryItemId);
}

async function getInventoryItemByIdWithDb(
  db: Database,
  inventoryItemId: number,
): Promise<InventoryItem | null> {
  const row = await db.getFirstAsync<InventoryItemRow>(
    `
      SELECT
        id,
        product_id,
        is_tracking_enabled,
        unit,
        current_quantity,
        low_stock_level,
        cost_per_unit,
        sku,
        supplier,
        created_at,
        updated_at
      FROM inventory_items
      WHERE id = ?
      LIMIT 1;
    `,
    inventoryItemId,
  );

  return row ? mapInventoryItem(row) : null;
}

async function getInventoryItemByProductId(
  productId: number,
): Promise<InventoryItem | null> {
  const db = await getDatabase();

  return getInventoryItemByProductIdWithDb(db, productId);
}

async function getInventoryItemByProductIdWithDb(
  db: Database,
  productId: number,
): Promise<InventoryItem | null> {
  const row = await db.getFirstAsync<InventoryItemRow>(
    `
      SELECT
        id,
        product_id,
        is_tracking_enabled,
        unit,
        current_quantity,
        low_stock_level,
        cost_per_unit,
        sku,
        supplier,
        created_at,
        updated_at
      FROM inventory_items
      WHERE product_id = ?
      LIMIT 1;
    `,
    productId,
  );

  return row ? mapInventoryItem(row) : null;
}

async function ensureProductExists(productId: number): Promise<void> {
  const db = await getDatabase();

  const product = await db.getFirstAsync<{ id: number }>(
    `
      SELECT id
      FROM products
      WHERE id = ?
      LIMIT 1;
    `,
    productId,
  );

  if (!product) {
    throw new Error("Product not found.");
  }
}

async function getProductName(productId: number): Promise<string> {
  const db = await getDatabase();

  const product = await db.getFirstAsync<{ name: string }>(
    `
      SELECT name
      FROM products
      WHERE id = ?
      LIMIT 1;
    `,
    productId,
  );

  if (!product) {
    throw new Error("Product not found.");
  }

  return product.name;
}

async function getProductNameWithDb(
  db: Database,
  productId: number,
): Promise<string> {
  const product = await db.getFirstAsync<{ name: string }>(
    `
      SELECT name
      FROM products
      WHERE id = ?
      LIMIT 1;
    `,
    productId,
  );

  if (!product) {
    throw new Error("Product not found.");
  }

  return product.name;
}

async function getOrCreateInventoryForProductWithDb(
  db: Database,
  productId: number,
): Promise<InventoryItem> {
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new Error("Invalid product.");
  }

  const existing = await getInventoryItemByProductIdWithDb(db, productId);

  if (existing) {
    return existing;
  }

  const product = await db.getFirstAsync<{ id: number }>(
    `
      SELECT id
      FROM products
      WHERE id = ?
      LIMIT 1;
    `,
    productId,
  );

  if (!product) {
    throw new Error("Product not found.");
  }

  const now = new Date().toISOString();

  await db.runAsync(
    `
      INSERT OR IGNORE INTO inventory_items (
        product_id,
        is_tracking_enabled,
        unit,
        current_quantity,
        low_stock_level,
        cost_per_unit,
        sku,
        supplier,
        created_at,
        updated_at
      )
      VALUES (?, 1, 'piece', 0, 0, 0, '', '', ?, ?);
    `,
    productId,
    now,
    now,
  );

  const inventory = await getInventoryItemByProductIdWithDb(db, productId);

  if (!inventory) {
    throw new Error("Unable to create inventory profile.");
  }

  return inventory;
}

export async function getOrCreateInventoryForProduct(
  productId: number,
): Promise<InventoryItem> {
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new Error("Invalid product.");
  }

  const existing = await getInventoryItemByProductId(productId);

  if (existing) {
    return existing;
  }

  await ensureProductExists(productId);

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `
      INSERT OR IGNORE INTO inventory_items (
        product_id,
        is_tracking_enabled,
        unit,
        current_quantity,
        low_stock_level,
        cost_per_unit,
        sku,
        supplier,
        created_at,
        updated_at
      )
      VALUES (?, 1, 'piece', 0, 0, 0, '', '', ?, ?);
    `,
    productId,
    now,
    now,
  );

  const inventory = await getInventoryItemByProductId(productId);

  if (!inventory) {
    throw new Error("Unable to create inventory profile.");
  }

  return inventory;
}

export async function initializeInventoryForProducts(): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `
      INSERT OR IGNORE INTO inventory_items (
        product_id,
        is_tracking_enabled,
        unit,
        current_quantity,
        low_stock_level,
        cost_per_unit,
        sku,
        supplier,
        created_at,
        updated_at
      )
      SELECT
        id,
        1,
        'piece',
        0,
        0,
        0,
        '',
        '',
        ?,
        ?
      FROM products;
    `,
    now,
    now,
  );

  return result.changes;
}

export async function getInventoryByProductId(
  productId: number,
): Promise<InventoryItem | null> {
  return getInventoryItemByProductId(productId);
}

export async function getInventoryWithProductByProductId(
  productId: number,
): Promise<InventoryItemWithProduct | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<InventoryItemWithProductRow>(
    `
      SELECT
        i.id,
        i.product_id,
        i.is_tracking_enabled,
        i.unit,
        i.current_quantity,
        i.low_stock_level,
        i.cost_per_unit,
        i.sku,
        i.supplier,
        i.created_at,
        i.updated_at,

        p.name AS product_name,
        p.description AS product_description,
        p.price AS product_price,
        p.is_active AS product_is_active

      FROM inventory_items i

      INNER JOIN products p
        ON p.id = i.product_id

      WHERE i.product_id = ?

      LIMIT 1;
    `,
    productId,
  );

  return row ? mapInventoryItemWithProduct(row) : null;
}

export async function getAllInventory(): Promise<InventoryItemWithProduct[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<InventoryItemWithProductRow>(
    `
      SELECT
        i.id,
        i.product_id,
        i.is_tracking_enabled,
        i.unit,
        i.current_quantity,
        i.low_stock_level,
        i.cost_per_unit,
        i.sku,
        i.supplier,
        i.created_at,
        i.updated_at,

        p.name AS product_name,
        p.description AS product_description,
        p.price AS product_price,
        p.is_active AS product_is_active

      FROM inventory_items i

      INNER JOIN products p
        ON p.id = i.product_id

      ORDER BY p.name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapInventoryItemWithProduct);
}

export async function updateInventorySettings(
  productId: number,
  input: UpdateInventorySettingsInput,
): Promise<InventoryItem> {
  const inventory = await getOrCreateInventoryForProduct(productId);

  if (
    input.lowStockLevel !== undefined &&
    (!Number.isFinite(input.lowStockLevel) || input.lowStockLevel < 0)
  ) {
    throw new Error("Low stock level cannot be negative.");
  }

  const unit = input.unit ?? inventory.unit;

  const isTrackingEnabled =
    input.isTrackingEnabled ?? inventory.isTrackingEnabled;

  const lowStockLevel = input.lowStockLevel ?? inventory.lowStockLevel;

  const sku =
    input.sku !== undefined ? normalizeText(input.sku) : inventory.sku;

  const supplier =
    input.supplier !== undefined
      ? normalizeText(input.supplier)
      : inventory.supplier;

  const changes: Record<string, { from: unknown; to: unknown }> = {};

  if (inventory.isTrackingEnabled !== isTrackingEnabled) {
    changes.isTrackingEnabled = {
      from: inventory.isTrackingEnabled,
      to: isTrackingEnabled,
    };
  }

  if (inventory.unit !== unit) {
    changes.unit = {
      from: inventory.unit,
      to: unit,
    };
  }

  if (inventory.lowStockLevel !== lowStockLevel) {
    changes.lowStockLevel = {
      from: inventory.lowStockLevel,
      to: lowStockLevel,
    };
  }

  if (inventory.sku !== sku) {
    changes.sku = {
      from: inventory.sku,
      to: sku,
    };
  }

  if (inventory.supplier !== supplier) {
    changes.supplier = {
      from: inventory.supplier,
      to: supplier,
    };
  }

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE inventory_items
      SET
        is_tracking_enabled = ?,
        unit = ?,
        low_stock_level = ?,
        sku = ?,
        supplier = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    isTrackingEnabled ? 1 : 0,
    unit,
    lowStockLevel,
    sku,
    supplier,
    now,
    inventory.id,
  );

  const updated = await getInventoryItemById(inventory.id);

  if (!updated) {
    throw new Error("Unable to update inventory settings.");
  }

  const productName = await getProductName(productId);

  if (inventory.isTrackingEnabled !== isTrackingEnabled) {
    await doAction(
      isTrackingEnabled ? "inventory.enabled" : "inventory.disabled",
      {
        inventory: updated,
        productName,
      },
    );
  }

  const otherChanges = { ...changes };
  delete otherChanges.isTrackingEnabled;

  if (Object.keys(otherChanges).length > 0) {
    await doAction("inventory.updated", {
      inventory: updated,
      productName,
      changes: otherChanges,
    });
  }

  return updated;
}

export async function stockIn(
  input: StockInInput,
): Promise<InventoryOperationResult> {
  validatePositiveQuantity(input.quantity);
  validateNonNegativeNumber(input.unitCost, "Unit cost");

  const db = await getDatabase();

  const operationResult: {
    value: InventoryOperationResult | null;
  } = {
    value: null,
  };

  await db.withTransactionAsync(async () => {
    const inventory = await getOrCreateInventoryForProduct(input.productId);

    const now = new Date().toISOString();

    const existingValue = inventory.currentQuantity * inventory.costPerUnit;

    const incomingValue = input.quantity * input.unitCost;

    const newQuantity = inventory.currentQuantity + input.quantity;

    const newCostPerUnit =
      newQuantity > 0 ? (existingValue + incomingValue) / newQuantity : 0;

    const supplier = normalizeText(input.supplier) || inventory.supplier;

    await db.runAsync(
      `
        UPDATE inventory_items
        SET
          current_quantity = ?,
          cost_per_unit = ?,
          supplier = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      newQuantity,
      newCostPerUnit,
      supplier,
      now,
      inventory.id,
    );

    const movementResult = await db.runAsync(
      `
        INSERT INTO inventory_movements (
          inventory_item_id,
          movement_type,
          quantity,
          balance_after,
          unit_cost,
          supplier,
          reference,
          reason,
          notes,
          job_order_id,
          created_by,
          created_at
        )
        VALUES (?, 'stock_received', ?, ?, ?, ?, ?, '', ?, NULL, ?, ?);
      `,
      inventory.id,
      input.quantity,
      newQuantity,
      input.unitCost,
      supplier,
      normalizeText(input.reference),
      normalizeText(input.notes),
      input.createdBy ?? null,
      now,
    );

    const updatedInventory = await getInventoryItemById(inventory.id);

    if (!updatedInventory) {
      throw new Error("Unable to load updated inventory.");
    }

    const movement = await getInventoryMovementById(
      movementResult.lastInsertRowId,
    );

    if (!movement) {
      throw new Error("Unable to load inventory movement.");
    }

    operationResult.value = {
      inventory: updatedInventory,
      movement,
    };
  });

  if (!operationResult.value) {
    throw new Error("Inventory stock-in failed.");
  }

  const result = operationResult.value;

  const productName = await getProductName(input.productId);

  await doAction("inventory.stock_received", {
    inventory: result.inventory,
    movement: result.movement,
    productName,
  });

  return result;
}

export async function stockOut(
  input: StockOutInput,
): Promise<InventoryOperationResult> {
  validatePositiveQuantity(input.quantity);

  const db = await getDatabase();

  const operationResult: {
    value: InventoryOperationResult | null;
  } = {
    value: null,
  };

  await db.withTransactionAsync(async () => {
    const inventory = await getOrCreateInventoryForProduct(input.productId);

    if (!inventory.isTrackingEnabled) {
      throw new Error("Inventory tracking is disabled for this product.");
    }

    if (input.quantity > inventory.currentQuantity) {
      throw new Error(
        `Insufficient stock. Available: ${formatQuantity(
          inventory.currentQuantity,
        )} ${inventory.unit}. Requested: ${formatQuantity(
          input.quantity,
        )} ${inventory.unit}.`,
      );
    }

    const now = new Date().toISOString();

    const newQuantity = inventory.currentQuantity - input.quantity;

    await db.runAsync(
      `
        UPDATE inventory_items
        SET
          current_quantity = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      newQuantity,
      now,
      inventory.id,
    );

    const movementResult = await db.runAsync(
      `
        INSERT INTO inventory_movements (
          inventory_item_id,
          movement_type,
          quantity,
          balance_after,
          unit_cost,
          supplier,
          reference,
          reason,
          notes,
          job_order_id,
          created_by,
          created_at
        )
        VALUES (?, 'stock_removed', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);
      `,
      inventory.id,
      -input.quantity,
      newQuantity,
      inventory.costPerUnit,
      inventory.supplier,
      normalizeText(input.reference),
      normalizeText(input.reason),
      normalizeText(input.notes),
      input.createdBy ?? null,
      now,
    );

    const updatedInventory = await getInventoryItemById(inventory.id);

    if (!updatedInventory) {
      throw new Error("Unable to load updated inventory.");
    }

    const movement = await getInventoryMovementById(
      movementResult.lastInsertRowId,
    );

    if (!movement) {
      throw new Error("Unable to load inventory movement.");
    }

    operationResult.value = {
      inventory: updatedInventory,
      movement,
    };
  });

  if (!operationResult.value) {
    throw new Error("Inventory stock-out failed.");
  }

  const result = operationResult.value;

  const productName = await getProductName(input.productId);

  await doAction("inventory.stock_removed", {
    inventory: result.inventory,
    movement: result.movement,
    productName,
  });

  return result;
}

export async function adjustInventory(
  input: StockAdjustmentInput,
): Promise<InventoryOperationResult> {
  validateNonNegativeNumber(input.actualQuantity, "Actual quantity");

  const reason = normalizeText(input.reason);

  if (!reason) {
    throw new Error("Adjustment reason is required.");
  }

  const db = await getDatabase();

  const operationResult: {
    value: InventoryOperationResult | null;
  } = {
    value: null,
  };

  await db.withTransactionAsync(async () => {
    const inventory = await getOrCreateInventoryForProduct(input.productId);

    if (!inventory.isTrackingEnabled) {
      throw new Error("Inventory tracking is disabled for this product.");
    }

    const difference = input.actualQuantity - inventory.currentQuantity;

    if (difference === 0) {
      throw new Error("The actual quantity is the same as the current stock.");
    }

    const now = new Date().toISOString();

    await db.runAsync(
      `
        UPDATE inventory_items
        SET
          current_quantity = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      input.actualQuantity,
      now,
      inventory.id,
    );

    const movementResult = await db.runAsync(
      `
        INSERT INTO inventory_movements (
          inventory_item_id,
          movement_type,
          quantity,
          balance_after,
          unit_cost,
          supplier,
          reference,
          reason,
          notes,
          job_order_id,
          created_by,
          created_at
        )
        VALUES (?, 'adjustment', ?, ?, ?, ?, '', ?, ?, NULL, ?, ?);
      `,
      inventory.id,
      difference,
      input.actualQuantity,
      inventory.costPerUnit,
      inventory.supplier,
      reason,
      normalizeText(input.notes),
      input.createdBy ?? null,
      now,
    );

    const updatedInventory = await getInventoryItemById(inventory.id);

    if (!updatedInventory) {
      throw new Error("Unable to load updated inventory.");
    }

    const movement = await getInventoryMovementById(
      movementResult.lastInsertRowId,
    );

    if (!movement) {
      throw new Error("Unable to load inventory movement.");
    }

    operationResult.value = {
      inventory: updatedInventory,
      movement,
    };
  });

  if (!operationResult.value) {
    throw new Error("Inventory adjustment failed.");
  }

  const result = operationResult.value;

  const productName = await getProductName(input.productId);

  await doAction("inventory.stock_adjusted", {
    inventory: result.inventory,
    movement: result.movement,
    productName,
  });

  return result;
}

/**
 * Records multiple inventory sales inside an existing database transaction.
 *
 * This function intentionally does NOT start its own transaction and does
 * NOT dispatch inventory audit actions. The caller owns the transaction
 * and is responsible for dispatching actions only after the transaction
 * successfully commits.
 */
export async function recordInventorySalesInTransaction(
  db: Database,
  inputs: InventorySaleRequirement[],
): Promise<InventoryOperationResult[]> {
  if (inputs.length === 0) {
    return [];
  }

  const aggregated = new Map<number, InventorySaleRequirement>();

  for (const input of inputs) {
    validatePositiveQuantity(input.quantity);

    const existing = aggregated.get(input.productId);

    if (existing) {
      existing.quantity += input.quantity;
      continue;
    }

    aggregated.set(input.productId, {
      productId: input.productId,
      quantity: input.quantity,
      jobOrderId: input.jobOrderId ?? null,
      reference: input.reference,
      notes: input.notes,
      createdBy: input.createdBy ?? null,
    });
  }

  const inventories = new Map<number, InventoryItem>();

  /*
   * First pass:
   * Load every inventory item and check every required quantity before
   * changing any inventory record.
   *
   * This prevents a partial deduction when one product has insufficient
   * stock but another product has enough.
   */
  for (const requirement of aggregated.values()) {
    const inventory = await getOrCreateInventoryForProductWithDb(
      db,
      requirement.productId,
    );

    if (!inventory.isTrackingEnabled) {
      continue;
    }

    if (requirement.quantity > inventory.currentQuantity) {
      throw new Error(
        `Insufficient stock for ${await getProductNameWithDb(
          db,
          requirement.productId,
        )}. Available: ${formatQuantity(
          inventory.currentQuantity,
        )} ${inventory.unit}. Requested: ${formatQuantity(
          requirement.quantity,
        )} ${inventory.unit}.`,
      );
    }

    inventories.set(requirement.productId, inventory);
  }

  const results: InventoryOperationResult[] = [];

  /*
   * Second pass:
   * All stock checks have passed, so now perform the actual deductions.
   */
  for (const requirement of aggregated.values()) {
    const inventory = inventories.get(requirement.productId);

    /*
     * Inventory tracking can be disabled for a product. Such a product
     * remains sellable through the POS but does not affect inventory.
     */
    if (!inventory) {
      continue;
    }

    const now = new Date().toISOString();
    const newQuantity = inventory.currentQuantity - requirement.quantity;

    await db.runAsync(
      `
        UPDATE inventory_items
        SET
          current_quantity = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      newQuantity,
      now,
      inventory.id,
    );

    const movementResult = await db.runAsync(
      `
        INSERT INTO inventory_movements (
          inventory_item_id,
          movement_type,
          quantity,
          balance_after,
          unit_cost,
          supplier,
          reference,
          reason,
          notes,
          job_order_id,
          created_by,
          created_at
        )
        VALUES (?, 'sale', ?, ?, ?, ?, ?, '', ?, ?, ?, ?);
      `,
      inventory.id,
      -requirement.quantity,
      newQuantity,
      inventory.costPerUnit,
      inventory.supplier,
      normalizeText(requirement.reference),
      normalizeText(requirement.notes),
      requirement.jobOrderId ?? null,
      requirement.createdBy ?? null,
      now,
    );

    const updatedInventory = await getInventoryItemByIdWithDb(db, inventory.id);

    if (!updatedInventory) {
      throw new Error("Unable to load updated inventory.");
    }

    const movement = await getInventoryMovementByIdWithDb(
      db,
      Number(movementResult.lastInsertRowId),
    );

    if (!movement) {
      throw new Error("Unable to load inventory movement.");
    }

    results.push({
      inventory: updatedInventory,
      movement,
    });
  }

  return results;
}

/**
 * Returns inventory for the actual sale movements belonging to a Job Order.
 *
 * This function intentionally does NOT start its own transaction and does
 * NOT dispatch inventory audit actions. The caller owns the transaction
 * and is responsible for dispatching actions only after the transaction
 * successfully commits.
 *
 * The sale movements recorded for the Job Order are the source of truth.
 * We do not reconstruct the current bundle definition when reversing a JO.
 */
export async function recordInventoryReturnsForJobOrderInTransaction(
  db: Database,
  jobOrderId: number,
  reference: string,
  createdBy: number | null,
): Promise<InventoryOperationResult[]> {
  if (!Number.isInteger(jobOrderId) || jobOrderId <= 0) {
    throw new Error("Invalid Job Order.");
  }

  const normalizedReference = normalizeText(reference);

  const saleMovements = await db.getAllAsync<{
    id: number;
    inventory_item_id: number;
    product_id: number;
    quantity: number;
    unit_cost: number;
    supplier: string;
  }>(
    `
      SELECT
        im.id,
        im.inventory_item_id,
        ii.product_id,
        im.quantity,
        im.unit_cost,
        im.supplier
      FROM inventory_movements im

      INNER JOIN inventory_items ii
        ON ii.id = im.inventory_item_id

      WHERE
        im.job_order_id = ?
        AND im.movement_type = 'sale'
      ORDER BY im.id ASC;
    `,
    jobOrderId,
  );

  if (saleMovements.length === 0) {
    return [];
  }

  /*
   * A Job Order should only be returned once.
   *
   * Since the return movements are linked to the same Job Order, this
   * prevents accidentally adding the same inventory back twice.
   */
  const existingReturn = await db.getFirstAsync<{ id: number }>(
    `
      SELECT id
      FROM inventory_movements
      WHERE
        job_order_id = ?
        AND movement_type = 'return'
      LIMIT 1;
    `,
    jobOrderId,
  );

  if (existingReturn) {
    throw new Error("Inventory for this Job Order has already been returned.");
  }

  const results: InventoryOperationResult[] = [];

  for (const sale of saleMovements) {
    /*
     * Sale quantities are stored as negative values.
     *
     * Example:
     * sale quantity = -2
     * return quantity = +2
     */
    const returnQuantity = Math.abs(sale.quantity);

    if (returnQuantity <= 0) {
      continue;
    }

    const inventory = await getInventoryItemByIdWithDb(
      db,
      sale.inventory_item_id,
    );

    if (!inventory) {
      throw new Error(
        `Inventory record not found for product ID ${sale.product_id}.`,
      );
    }

    /*
     * Inventory tracking may have been disabled after the original sale.
     *
     * The original sale already affected inventory, so the return must
     * still restore that stock. We intentionally do NOT block the return
     * based on the current tracking setting.
     */
    const existingValue = inventory.currentQuantity * inventory.costPerUnit;

    const returnedValue = returnQuantity * sale.unit_cost;

    const newQuantity = inventory.currentQuantity + returnQuantity;

    const newCostPerUnit =
      newQuantity > 0 ? (existingValue + returnedValue) / newQuantity : 0;

    const now = new Date().toISOString();

    await db.runAsync(
      `
        UPDATE inventory_items
        SET
          current_quantity = ?,
          cost_per_unit = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      newQuantity,
      newCostPerUnit,
      now,
      inventory.id,
    );

    const movementResult = await db.runAsync(
      `
        INSERT INTO inventory_movements (
          inventory_item_id,
          movement_type,
          quantity,
          balance_after,
          unit_cost,
          supplier,
          reference,
          reason,
          notes,
          job_order_id,
          created_by,
          created_at
        )
        VALUES (?, 'return', ?, ?, ?, ?, ?, ?, '', ?, ?, ?);
      `,
      inventory.id,
      returnQuantity,
      newQuantity,
      sale.unit_cost,
      sale.supplier,
      normalizedReference,
      "Voided Job Order",
      jobOrderId,
      createdBy,
      now,
    );

    const updatedInventory = await getInventoryItemByIdWithDb(db, inventory.id);

    if (!updatedInventory) {
      throw new Error("Unable to load updated inventory.");
    }

    const movement = await getInventoryMovementByIdWithDb(
      db,
      Number(movementResult.lastInsertRowId),
    );

    if (!movement) {
      throw new Error("Unable to load inventory return movement.");
    }

    results.push({
      inventory: updatedInventory,
      movement,
    });
  }

  return results;
}

export async function recordInventorySale(
  input: StockSaleInput,
): Promise<InventoryOperationResult> {
  validatePositiveQuantity(input.quantity);

  const db = await getDatabase();

  const operationResult: {
    value: InventoryOperationResult | null;
  } = {
    value: null,
  };

  await db.withTransactionAsync(async () => {
    const results = await recordInventorySalesInTransaction(db, [
      {
        productId: input.productId,
        quantity: input.quantity,
        jobOrderId: input.jobOrderId ?? null,
        reference: input.reference,
        notes: input.notes,
        createdBy: input.createdBy ?? null,
      },
    ]);

    /*
     * A direct call to recordInventorySale() for a product with tracking
     * disabled intentionally produces no inventory movement.
     */
    if (results.length === 0) {
      operationResult.value = null;
      return;
    }

    operationResult.value = results[0];
  });

  if (!operationResult.value) {
    throw new Error("Inventory tracking is disabled for this product.");
  }

  const result = operationResult.value;

  const productName = await getProductName(input.productId);

  await doAction("inventory.stock_sold", {
    inventory: result.inventory,
    movement: result.movement,
    productName,
  });

  return result;
}

export async function recordInventoryReturn(
  input: StockReturnInput,
): Promise<InventoryOperationResult> {
  validatePositiveQuantity(input.quantity);

  if (
    input.unitCost !== undefined &&
    (!Number.isFinite(input.unitCost) || input.unitCost < 0)
  ) {
    throw new Error("Unit cost cannot be negative.");
  }

  const db = await getDatabase();

  const operationResult: {
    value: InventoryOperationResult | null;
  } = {
    value: null,
  };

  await db.withTransactionAsync(async () => {
    const inventory = await getOrCreateInventoryForProduct(input.productId);

    if (!inventory.isTrackingEnabled) {
      throw new Error("Inventory tracking is disabled for this product.");
    }

    const returnUnitCost = input.unitCost ?? inventory.costPerUnit;

    const existingValue = inventory.currentQuantity * inventory.costPerUnit;

    const returnedValue = input.quantity * returnUnitCost;

    const newQuantity = inventory.currentQuantity + input.quantity;

    const newCostPerUnit =
      newQuantity > 0 ? (existingValue + returnedValue) / newQuantity : 0;

    const now = new Date().toISOString();

    await db.runAsync(
      `
        UPDATE inventory_items
        SET
          current_quantity = ?,
          cost_per_unit = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      newQuantity,
      newCostPerUnit,
      now,
      inventory.id,
    );

    const movementResult = await db.runAsync(
      `
        INSERT INTO inventory_movements (
          inventory_item_id,
          movement_type,
          quantity,
          balance_after,
          unit_cost,
          supplier,
          reference,
          reason,
          notes,
          job_order_id,
          created_by,
          created_at
        )
        VALUES (?, 'return', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      inventory.id,
      input.quantity,
      newQuantity,
      returnUnitCost,
      inventory.supplier,
      normalizeText(input.reference),
      normalizeText(input.reason),
      normalizeText(input.notes),
      input.jobOrderId ?? null,
      input.createdBy ?? null,
      now,
    );

    const updatedInventory = await getInventoryItemById(inventory.id);

    if (!updatedInventory) {
      throw new Error("Unable to load updated inventory.");
    }

    const movement = await getInventoryMovementById(
      movementResult.lastInsertRowId,
    );

    if (!movement) {
      throw new Error("Unable to load inventory movement.");
    }

    operationResult.value = {
      inventory: updatedInventory,
      movement,
    };
  });

  if (!operationResult.value) {
    throw new Error("Inventory return failed.");
  }

  const result = operationResult.value;

  const productName = await getProductName(input.productId);

  await doAction("inventory.stock_returned", {
    inventory: result.inventory,
    movement: result.movement,
    productName,
  });

  return result;
}

async function getInventoryMovementByIdWithDb(
  db: Database,
  movementId: number,
): Promise<InventoryMovement | null> {
  const row = await db.getFirstAsync<InventoryMovementRow>(
    `
      SELECT
        im.id,
        im.inventory_item_id,
        im.movement_type,
        im.quantity,
        im.balance_after,
        im.unit_cost,
        im.supplier,
        im.reference,
        im.reason,
        im.notes,
        im.job_order_id,
        jo.job_order_number AS job_order_number,
        im.created_by,
        u.full_name AS created_by_name,
        im.created_at
      FROM inventory_movements im

      LEFT JOIN job_orders jo
  ON jo.id = im.job_order_id

      LEFT JOIN users u
        ON u.id = im.created_by

      WHERE im.id = ?
      LIMIT 1;
    `,
    movementId,
  );

  return row ? mapInventoryMovement(row) : null;
}

export async function getInventoryMovements(
  productId: number,
): Promise<InventoryMovement[]> {
  const inventory = await getInventoryItemByProductId(productId);

  if (!inventory) {
    return [];
  }

  const db = await getDatabase();

  const rows = await db.getAllAsync<InventoryMovementRow>(
    `
      SELECT
        im.id,
        im.inventory_item_id,
        im.movement_type,
        im.quantity,
        im.balance_after,
        im.unit_cost,
        im.supplier,
        im.reference,
        im.reason,
        im.notes,
        im.job_order_id,
        jo.job_order_number AS job_order_number,
        im.created_by,
        u.full_name AS created_by_name,
        im.created_at
      FROM inventory_movements im

      LEFT JOIN job_orders jo
  ON jo.id = im.job_order_id

      LEFT JOIN users u
        ON u.id = im.created_by

      WHERE im.inventory_item_id = ?
      ORDER BY im.created_at DESC, im.id DESC;
    `,
    inventory.id,
  );

  return rows.map(mapInventoryMovement);
}

export async function getInventoryMovementById(
  movementId: number,
): Promise<InventoryMovement | null> {
  const db = await getDatabase();

  return getInventoryMovementByIdWithDb(db, movementId);
}

export async function getRecentInventoryMovements(
  limit = 20,
): Promise<InventoryMovement[]> {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));

  const db = await getDatabase();

  const rows = await db.getAllAsync<InventoryMovementRow>(
    `
      SELECT
        im.id,
        im.inventory_item_id,
        im.movement_type,
        im.quantity,
        im.balance_after,
        im.unit_cost,
        im.supplier,
        im.reference,
        im.reason,
        im.notes,
        im.job_order_id,
        jo.job_order_number AS job_order_number,
        im.created_by,
        u.full_name AS created_by_name,
        im.created_at
      FROM inventory_movements im

      LEFT JOIN job_orders jo
  ON jo.id = im.job_order_id

      LEFT JOIN users u
        ON u.id = im.created_by

      ORDER BY im.created_at DESC, im.id DESC
      LIMIT ?;
    `,
    safeLimit,
  );

  return rows.map(mapInventoryMovement);
}

export async function getInventoryValue(): Promise<number> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<{
    inventory_value: number | null;
  }>(
    `
      SELECT
        COALESCE(
          SUM(current_quantity * cost_per_unit),
          0
        ) AS inventory_value
      FROM inventory_items
      WHERE is_tracking_enabled = 1;
    `,
  );

  return row?.inventory_value ?? 0;
}

export async function getLowStockInventory(): Promise<
  InventoryItemWithProduct[]
> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<InventoryItemWithProductRow>(
    `
      SELECT
        i.id,
        i.product_id,
        i.is_tracking_enabled,
        i.unit,
        i.current_quantity,
        i.low_stock_level,
        i.cost_per_unit,
        i.sku,
        i.supplier,
        i.created_at,
        i.updated_at,

        p.name AS product_name,
        p.description AS product_description,
        p.price AS product_price,
        p.is_active AS product_is_active

      FROM inventory_items i

      INNER JOIN products p
        ON p.id = i.product_id

      WHERE
        i.is_tracking_enabled = 1
        AND i.current_quantity <= i.low_stock_level

      ORDER BY
        i.current_quantity ASC,
        p.name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapInventoryItemWithProduct);
}

export async function getOutOfStockInventory(): Promise<
  InventoryItemWithProduct[]
> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<InventoryItemWithProductRow>(
    `
      SELECT
        i.id,
        i.product_id,
        i.is_tracking_enabled,
        i.unit,
        i.current_quantity,
        i.low_stock_level,
        i.cost_per_unit,
        i.sku,
        i.supplier,
        i.created_at,
        i.updated_at,

        p.name AS product_name,
        p.description AS product_description,
        p.price AS product_price,
        p.is_active AS product_is_active

      FROM inventory_items i

      INNER JOIN products p
        ON p.id = i.product_id

      WHERE
        i.is_tracking_enabled = 1
        AND i.current_quantity <= 0

      ORDER BY p.name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapInventoryItemWithProduct);
}

export async function getInventoryDashboardCounts(): Promise<{
  trackedProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryValue: number;
}> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<{
    tracked_products: number;
    low_stock_products: number;
    out_of_stock_products: number;
    inventory_value: number;
  }>(
    `
      SELECT
        COUNT(*) AS tracked_products,

        SUM(
          CASE
            WHEN current_quantity <= low_stock_level
            THEN 1
            ELSE 0
          END
        ) AS low_stock_products,

        SUM(
          CASE
            WHEN current_quantity <= 0
            THEN 1
            ELSE 0
          END
        ) AS out_of_stock_products,

        COALESCE(
          SUM(current_quantity * cost_per_unit),
          0
        ) AS inventory_value

      FROM inventory_items

      WHERE is_tracking_enabled = 1;
    `,
  );

  return {
    trackedProducts: row?.tracked_products ?? 0,
    lowStockProducts: row?.low_stock_products ?? 0,
    outOfStockProducts: row?.out_of_stock_products ?? 0,
    inventoryValue: row?.inventory_value ?? 0,
  };
}

function formatQuantity(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}
