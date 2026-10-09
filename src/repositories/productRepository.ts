import { getDatabase } from "@/database";
import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
} from "@/models/product";

import { doAction } from "@/hooks/actions";

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

export async function getProductById(id: number): Promise<Product | null> {
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
    throw new Error("Product was created but could not be retrieved.");
  }

  await doAction("product.created", {
    product,
  });

  return product;
}

export async function updateProduct(
  id: number,
  input: UpdateProductInput,
): Promise<Product> {
  const db = await getDatabase();

  const existingProduct = await getProductById(id);

  if (!existingProduct) {
    throw new Error("Product could not be found.");
  }

  const updatedName = input.name.trim();
  const updatedDescription = input.description?.trim() ?? "";
  const updatedPrice = input.price;

  const changes: Record<
    string,
    {
      from: unknown;
      to: unknown;
    }
  > = {};

  if (existingProduct.name !== updatedName) {
    changes.name = {
      from: existingProduct.name,
      to: updatedName,
    };
  }

  if (existingProduct.description !== updatedDescription) {
    changes.description = {
      from: existingProduct.description,
      to: updatedDescription,
    };
  }

  if (existingProduct.price !== updatedPrice) {
    changes.price = {
      from: existingProduct.price,
      to: updatedPrice,
    };
  }

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
    updatedName,
    updatedDescription,
    updatedPrice,
    now,
    id,
  );

  const product = await getProductById(id);

  if (!product) {
    throw new Error("Product could not be found after update.");
  }

  if (Object.keys(changes).length > 0) {
    await doAction("product.updated", {
      product,
      changes,
    });
  }

  return product;
}

export async function setProductActive(
  id: number,
  isActive: boolean,
): Promise<Product> {
  const db = await getDatabase();

  const existingProduct = await getProductById(id);

  if (!existingProduct) {
    throw new Error("Product could not be found.");
  }

  if (existingProduct.isActive === isActive) {
    return existingProduct;
  }

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
    throw new Error("Product could not be found after status update.");
  }

  if (isActive) {
    await doAction("product.activated", {
      product,
    });
  } else {
    await doAction("product.deactivated", {
      product,
    });
  }

  return product;
}
