import { getDatabase } from "@/database";
import type {
  Bundle,
  BundleItem,
  CreateBundleInput,
  UpdateBundleInput,
} from "@/models/bundle";

type BundleRow = {
  id: number;
  name: string;
  description: string;
  price: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type BundleItemRow = {
  id: number;
  bundle_id: number;
  item_type: "product" | "service";
  item_id: number;
  item_name: string | null;
  quantity: number;
  unit_price: number | null;
};

function mapBundle(
  row: BundleRow,
  items: BundleItem[] = [],
): Bundle {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    isActive: row.is_active === 1,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBundleItem(
  row: BundleItemRow,
): BundleItem {
  return {
    id: row.id,
    bundleId: row.bundle_id,
    itemType: row.item_type,
    itemId: row.item_id,
    itemName: row.item_name ?? "",
    quantity: row.quantity,
    unitPrice: row.unit_price ?? 0,
  };
}

async function getBundleItems(
  bundleId: number,
): Promise<BundleItem[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<BundleItemRow>(
    `
      SELECT
        bi.id,
        bi.bundle_id,
        bi.item_type,
        bi.item_id,
        bi.quantity,

        CASE
          WHEN bi.item_type = 'product'
            THEN p.name
          WHEN bi.item_type = 'service'
            THEN s.name
        END AS item_name,

        CASE
          WHEN bi.item_type = 'product'
            THEN p.price
          WHEN bi.item_type = 'service'
            THEN s.price
        END AS unit_price

      FROM bundle_items bi

      LEFT JOIN products p
        ON bi.item_type = 'product'
        AND bi.item_id = p.id

      LEFT JOIN services s
        ON bi.item_type = 'service'
        AND bi.item_id = s.id

      WHERE bi.bundle_id = ?

      ORDER BY bi.id ASC;
    `,
    bundleId,
  );

  return rows
    .filter(
      (row) =>
        row.item_name !== null &&
        row.unit_price !== null,
    )
    .map(mapBundleItem);
}

export async function getBundles(): Promise<Bundle[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<BundleRow>(
    `
      SELECT
        id,
        name,
        description,
        price,
        is_active,
        created_at,
        updated_at
      FROM bundles
      ORDER BY name COLLATE NOCASE ASC;
    `,
  );

  const bundles: Bundle[] = [];

  for (const row of rows) {
    const items = await getBundleItems(row.id);

    bundles.push(
      mapBundle(row, items),
    );
  }

  return bundles;
}

export async function getBundleById(
  id: number,
): Promise<Bundle | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<BundleRow>(
    `
      SELECT
        id,
        name,
        description,
        price,
        is_active,
        created_at,
        updated_at
      FROM bundles
      WHERE id = ?;
    `,
    id,
  );

  if (!row) {
    return null;
  }

  const items = await getBundleItems(id);

  return mapBundle(row, items);
}

export async function createBundle(
  input: CreateBundleInput,
): Promise<Bundle> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  const result = await db.runAsync(
    `
      INSERT INTO bundles (
        name,
        description,
        price,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 1, ?, ?);
    `,
    input.name.trim(),
    input.description?.trim() ?? "",
    input.price,
    now,
    now,
  );

  const bundleId = result.lastInsertRowId;

  for (const item of input.items) {
    await db.runAsync(
      `
        INSERT INTO bundle_items (
          bundle_id,
          item_type,
          item_id,
          quantity,
          created_at
        )
        VALUES (?, ?, ?, ?, ?);
      `,
      bundleId,
      item.itemType,
      item.itemId,
      item.quantity,
      now,
    );
  }

  const bundle = await getBundleById(bundleId);

  if (!bundle) {
    throw new Error(
      "Bundle was created but could not be retrieved.",
    );
  }

  return bundle;
}

export async function updateBundle(
  id: number,
  input: UpdateBundleInput,
): Promise<Bundle> {
  const db = await getDatabase();

  const existingBundle = await getBundleById(id);

  if (!existingBundle) {
    throw new Error(
      "Bundle could not be found.",
    );
  }

  const now = new Date().toISOString();

  /*
   * Update the bundle itself first.
   */
  await db.runAsync(
    `
      UPDATE bundles
      SET
        name = ?,
        description = ?,
        price = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    input.name.trim(),
    input.description?.trim() ?? "",
    input.price,
    now,
    id,
  );

  /*
   * Remove the existing bundle items.
   *
   * We intentionally do this outside a SQLite transaction
   * because the previous transaction-based implementation
   * could remain pending indefinitely with the current
   * Expo SQLite setup.
   */
  await db.runAsync(
    `
      DELETE FROM bundle_items
      WHERE bundle_id = ?;
    `,
    id,
  );

  /*
   * Insert the current items.
   */
  for (const item of input.items) {
    await db.runAsync(
      `
        INSERT INTO bundle_items (
          bundle_id,
          item_type,
          item_id,
          quantity,
          created_at
        )
        VALUES (?, ?, ?, ?, ?);
      `,
      id,
      item.itemType,
      item.itemId,
      item.quantity,
      now,
    );
  }

  /*
   * Retrieve the final saved bundle.
   */
  const updatedBundle = await getBundleById(id);

  if (!updatedBundle) {
    throw new Error(
      "Bundle was updated but could not be retrieved.",
    );
  }

  return updatedBundle;
}

export async function setBundleActive(
  id: number,
  isActive: boolean,
): Promise<Bundle> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE bundles
      SET
        is_active = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    isActive ? 1 : 0,
    now,
    id,
  );

  const bundle = await getBundleById(id);

  if (!bundle) {
    throw new Error(
      "Bundle could not be found after status update.",
    );
  }

  return bundle;
}