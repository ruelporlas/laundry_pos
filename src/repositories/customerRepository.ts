import { getDatabase } from "@/database";
import type {
  CreateCustomerInput,
  Customer,
  UpdateCustomerInput,
} from "@/models/customer";

type CustomerRow = {
  id: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<CustomerRow>(
    `
      SELECT
        id,
        name,
        phone,
        address,
        notes,
        is_active,
        created_at,
        updated_at
      FROM customers
      ORDER BY name COLLATE NOCASE ASC;
    `
  );

  return rows.map(mapCustomer);
}

export async function getCustomerById(
  id: number
): Promise<Customer | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<CustomerRow>(
    `
      SELECT
        id,
        name,
        phone,
        address,
        notes,
        is_active,
        created_at,
        updated_at
      FROM customers
      WHERE id = ?;
    `,
    id
  );

  return row ? mapCustomer(row) : null;
}

export async function createCustomer(
  input: CreateCustomerInput
): Promise<Customer> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  const result = await db.runAsync(
    `
      INSERT INTO customers (
        name,
        phone,
        address,
        notes,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 1, ?, ?);
    `,
    input.name.trim(),
    input.phone?.trim() ?? "",
    input.address?.trim() ?? "",
    input.notes?.trim() ?? "",
    now,
    now
  );

  const customer = await getCustomerById(result.lastInsertRowId);

  if (!customer) {
    throw new Error(
      "Customer was created but could not be retrieved."
    );
  }

  return customer;
}

export async function updateCustomer(
  id: number,
  input: UpdateCustomerInput
): Promise<Customer> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE customers
      SET
        name = ?,
        phone = ?,
        address = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    input.name.trim(),
    input.phone?.trim() ?? "",
    input.address?.trim() ?? "",
    input.notes?.trim() ?? "",
    now,
    id
  );

  const customer = await getCustomerById(id);

  if (!customer) {
    throw new Error(
      "Customer could not be found after update."
    );
  }

  return customer;
}

export async function setCustomerActive(
  id: number,
  isActive: boolean
): Promise<Customer> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE customers
      SET
        is_active = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    isActive ? 1 : 0,
    now,
    id
  );

  const customer = await getCustomerById(id);

  if (!customer) {
    throw new Error(
      "Customer could not be found after status update."
    );
  }

  return customer;
}

