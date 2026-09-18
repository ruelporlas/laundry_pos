import { getDatabase } from "./database";

type TableCheck = {
  name: string;
};

const EXPECTED_DATABASE_VERSION = 8;

export async function checkDatabase(): Promise<boolean> {
  const db = await getDatabase();

  const version = await db.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version;");

  if (version?.user_version !== EXPECTED_DATABASE_VERSION) {
    console.error(
      `Database version mismatch. Expected ${EXPECTED_DATABASE_VERSION}, got ${version?.user_version}.`,
    );

    return false;
  }

  const requiredTables = [
    "customers",
    "products",
    "services",
    "bundles",
    "bundle_items",
    "job_orders",
    "job_order_items",
    "payments",
    "users",
  ];

  for (const tableName of requiredTables) {
    const table = await db.getFirstAsync<TableCheck>(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = ?;
      `,
      tableName,
    );

    if (table?.name !== tableName) {
      console.error(
        `Database health check failed. Missing table: ${tableName}`,
      );

      return false;
    }
  }

  return true;
}
