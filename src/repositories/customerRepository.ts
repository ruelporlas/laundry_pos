import { getDatabase } from "@/database";
import { doAction } from "@/hooks/actions";
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
    `,
  );

  return rows.map(mapCustomer);
}

export async function getCustomerById(id: number): Promise<Customer | null> {
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
    id,
  );

  return row ? mapCustomer(row) : null;
}

export async function createCustomer(
  input: CreateCustomerInput,
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
    now,
  );

  const customer = await getCustomerById(result.lastInsertRowId);

  if (!customer) {
    throw new Error("Customer was created but could not be retrieved.");
  }

  await doAction("customer.created", {
    customer,
  });

  return customer;
}

export async function updateCustomer(
  id: number,
  input: UpdateCustomerInput,
): Promise<Customer> {
  const db = await getDatabase();

  const existingCustomer = await getCustomerById(id);

  if (!existingCustomer) {
    throw new Error("Customer could not be found.");
  }

  const updatedName = input.name.trim();
  const updatedPhone = input.phone?.trim() ?? "";
  const updatedAddress = input.address?.trim() ?? "";
  const updatedNotes = input.notes?.trim() ?? "";

  const changes: Record<
    string,
    {
      from: unknown;
      to: unknown;
    }
  > = {};

  if (existingCustomer.name !== updatedName) {
    changes.name = {
      from: existingCustomer.name,
      to: updatedName,
    };
  }

  if (existingCustomer.phone !== updatedPhone) {
    changes.phone = {
      from: existingCustomer.phone,
      to: updatedPhone,
    };
  }

  if (existingCustomer.address !== updatedAddress) {
    changes.address = {
      from: existingCustomer.address,
      to: updatedAddress,
    };
  }

  if (existingCustomer.notes !== updatedNotes) {
    changes.notes = {
      from: existingCustomer.notes,
      to: updatedNotes,
    };
  }

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
    updatedName,
    updatedPhone,
    updatedAddress,
    updatedNotes,
    now,
    id,
  );

  const customer = await getCustomerById(id);

  if (!customer) {
    throw new Error("Customer could not be found after update.");
  }

  if (Object.keys(changes).length > 0) {
    await doAction("customer.updated", {
      customer,
      changes,
    });
  }

  return customer;
}

export async function setCustomerActive(
  id: number,
  isActive: boolean,
): Promise<Customer> {
  const db = await getDatabase();

  const existingCustomer = await getCustomerById(id);

  if (!existingCustomer) {
    throw new Error("Customer could not be found.");
  }

  if (existingCustomer.isActive === isActive) {
    return existingCustomer;
  }

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
    id,
  );

  const customer = await getCustomerById(id);

  if (!customer) {
    throw new Error("Customer could not be found after status update.");
  }

  if (isActive) {
    await doAction("customer.activated", {
      customer,
    });
  } else {
    await doAction("customer.deactivated", {
      customer,
    });
  }

  return customer;
}
