import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "laundry_pos.db";

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  try {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    await db.execAsync(`
      PRAGMA foreign_keys = ON;
    `);

    database = db;

    return db;
  } catch (error) {
    console.error("SQLite database initialization failed:", error);

    database = null;

    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (!database) {
    return;
  }

  try {
    await database.closeAsync();
  } finally {
    database = null;
  }
}
