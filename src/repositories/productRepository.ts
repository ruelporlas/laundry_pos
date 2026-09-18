import { getDatabase } from "@/database";
import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
} from "@/models/product";

type ProductRow = {
  id: number;
  name: string;
  description: string;
  price: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProducts(): Promise<Product[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<ProductRow>(
    `
      SELECT
        id,
        name,
        description,
        price,
        is_active,
        created_at,
        updated_at
      FROM products
      ORDER BY name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapProduct);
}

export async function getProductById(
  id: number,
): Promise<Product | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<ProductRow>(
    `
      SELECT
        id,
        name,
        description,
        price,
        is_active,
        created_at,
        updated_at
      FROM products
      WHERE id = ?;
    `,
    id,
  );

  return row ? mapProduct(row) : null;
}

export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  const result = await db.runAsync(
    `
      INSERT INTO products (
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

  const product = await getProductById(result.lastInsertRowId);

  if (!product) {
    throw new Error(
      "Product was created but could not be retrieved.",
    );
  }

  return product;
}

export async function updateProduct(
  id: number,
  input: UpdateProductInput,
): Promise<Product> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE products
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

  const product = await getProductById(id);

  if (!product) {
    throw new Error(
      "Product could not be found after update.",
    );
  }

  return product;
}

export async function setProductActive(
  id: number,
  isActive: boolean,
): Promise<Product> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE products
      SET
        is_active = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    isActive ? 1 : 0,
    now,
    id,
  );

  const product = await getProductById(id);

  if (!product) {
    throw new Error(
      "Product could not be found after status update.",
    );
  }

  return product;
}