import { getDatabase } from "@/database";
import type {
  CreateServiceInput,
  Service,
  UpdateServiceInput,
} from "@/models/service";

type ServiceRow = {
  id: number;
  name: string;
  description: string;
  price: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function mapService(row: ServiceRow): Service {
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

export async function getServices(): Promise<Service[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<ServiceRow>(
    `
      SELECT
        id,
        name,
        description,
        price,
        is_active,
        created_at,
        updated_at
      FROM services
      ORDER BY name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapService);
}

export async function getServiceById(
  id: number,
): Promise<Service | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<ServiceRow>(
    `
      SELECT
        id,
        name,
        description,
        price,
        is_active,
        created_at,
        updated_at
      FROM services
      WHERE id = ?;
    `,
    id,
  );

  return row ? mapService(row) : null;
}

export async function createService(
  input: CreateServiceInput,
): Promise<Service> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  const result = await db.runAsync(
    `
      INSERT INTO services (
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

  const service = await getServiceById(
    result.lastInsertRowId,
  );

  if (!service) {
    throw new Error(
      "Service was created but could not be retrieved.",
    );
  }

  return service;
}

export async function updateService(
  id: number,
  input: UpdateServiceInput,
): Promise<Service> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE services
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

  const service = await getServiceById(id);

  if (!service) {
    throw new Error(
      "Service could not be found after update.",
    );
  }

  return service;
}

export async function setServiceActive(
  id: number,
  isActive: boolean,
): Promise<Service> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE services
      SET
        is_active = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    isActive ? 1 : 0,
    now,
    id,
  );

  const service = await getServiceById(id);

  if (!service) {
    throw new Error(
      "Service could not be found after status update.",
    );
  }

  return service;
}