import { getDatabase } from "./database";

const DATABASE_VERSION = 8;

export async function runMigrations(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA foreign_keys = ON;
  `);

  const result = await db.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version;");

  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < DATABASE_VERSION) {
    await applyMigrations(db, currentVersion);
  }
}

async function applyMigrations(
  db: Awaited<ReturnType<typeof getDatabase>>,
  currentVersion: number,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    if (currentVersion < 1) {
      await migrateToVersion1(db);
    }

    if (currentVersion < 2) {
      await migrateToVersion2(db);
    }

    if (currentVersion < 3) {
      await migrateToVersion3(db);
    }

    if (currentVersion < 4) {
      await migrateToVersion4(db);
    }

    if (currentVersion < 5) {
      await migrateToVersion5(db);
    }

    if (currentVersion < 6) {
      await migrateToVersion6(db);
    }

    if (currentVersion < 7) {
      await migrateToVersion7(db);
    }

    if (currentVersion < 8) {
      await migrateToVersion8(db);
    }

    await db.execAsync(`
      PRAGMA user_version = ${DATABASE_VERSION};
    `);
  });
}

async function migrateToVersion1(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _database_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL
    );
  `);

  const existingInfo = await db.getFirstAsync<{
    id: number;
  }>("SELECT id FROM _database_info LIMIT 1;");

  if (!existingInfo) {
    await db.runAsync(
      "INSERT INTO _database_info (created_at) VALUES (?);",
      new Date().toISOString(),
    );
  }
}

async function migrateToVersion2(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',

      is_active INTEGER NOT NULL DEFAULT 1,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_name
      ON customers(name);

    CREATE INDEX IF NOT EXISTS idx_customers_phone
      ON customers(phone);
  `);
}

async function migrateToVersion3(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL DEFAULT 0,

      is_active INTEGER NOT NULL DEFAULT 1,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_name
      ON products(name);

    CREATE INDEX IF NOT EXISTS idx_products_active
      ON products(is_active);
  `);
}

async function migrateToVersion4(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL DEFAULT 0,

      is_active INTEGER NOT NULL DEFAULT 1,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_services_name
      ON services(name);

    CREATE INDEX IF NOT EXISTS idx_services_active
      ON services(is_active);
  `);
}

async function migrateToVersion5(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bundles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL DEFAULT 0,

      is_active INTEGER NOT NULL DEFAULT 1,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bundles_name
      ON bundles(name);

    CREATE INDEX IF NOT EXISTS idx_bundles_active
      ON bundles(is_active);

    CREATE TABLE IF NOT EXISTS bundle_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      bundle_id INTEGER NOT NULL,

      item_type TEXT NOT NULL
        CHECK (item_type IN ('product', 'service')),

      item_id INTEGER NOT NULL,

      quantity REAL NOT NULL DEFAULT 1
        CHECK (quantity > 0),

      created_at TEXT NOT NULL,

      FOREIGN KEY (bundle_id)
        REFERENCES bundles(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id
      ON bundle_items(bundle_id);

    CREATE INDEX IF NOT EXISTS idx_bundle_items_item
      ON bundle_items(item_type, item_id);
  `);
}

async function migrateToVersion6(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS job_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      job_order_number TEXT NOT NULL UNIQUE,

      customer_id INTEGER NOT NULL,

      subtotal REAL NOT NULL DEFAULT 0,

      discount_type TEXT
        CHECK (
          discount_type IS NULL
          OR discount_type IN ('percentage', 'fixed')
        ),

      discount_value REAL NOT NULL DEFAULT 0,

      discount_amount REAL NOT NULL DEFAULT 0,

      total REAL NOT NULL DEFAULT 0,

      amount_paid REAL NOT NULL DEFAULT 0,

      balance REAL NOT NULL DEFAULT 0,

      payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (
          payment_status IN (
            'paid',
            'partially_paid',
            'unpaid'
          )
        ),

      is_voided INTEGER NOT NULL DEFAULT 0,

      voided_by INTEGER,

      voided_at TEXT,

      void_reason TEXT,

      notes TEXT NOT NULL DEFAULT '',

      created_by INTEGER,

      created_at TEXT NOT NULL,

      updated_by INTEGER,

      updated_at TEXT,

      FOREIGN KEY (customer_id)
        REFERENCES customers(id)
  );

    CREATE INDEX IF NOT EXISTS idx_job_orders_customer_id
      ON job_orders(customer_id);

    CREATE INDEX IF NOT EXISTS idx_job_orders_number
      ON job_orders(job_order_number);

    CREATE INDEX IF NOT EXISTS idx_job_orders_created_at
      ON job_orders(created_at);

    CREATE INDEX IF NOT EXISTS idx_job_orders_payment_status
      ON job_orders(payment_status);

    CREATE TABLE IF NOT EXISTS job_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      job_order_id INTEGER NOT NULL,

      item_type TEXT NOT NULL
        CHECK (
          item_type IN (
            'product',
            'service',
            'bundle'
          )
        ),

      item_id INTEGER NOT NULL,

      item_name TEXT NOT NULL,

      unit_price REAL NOT NULL DEFAULT 0,

      quantity REAL NOT NULL DEFAULT 1
        CHECK (quantity > 0),

      line_total REAL NOT NULL DEFAULT 0,

      created_at TEXT NOT NULL,

      FOREIGN KEY (job_order_id)
        REFERENCES job_orders(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_job_order_items_job_order_id
      ON job_order_items(job_order_id);

    CREATE INDEX IF NOT EXISTS idx_job_order_items_item
      ON job_order_items(item_type, item_id);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      job_order_id INTEGER NOT NULL,

      payment_method TEXT NOT NULL
        CHECK (
          payment_method IN (
            'cash',
            'gcash'
          )
        ),

      amount REAL NOT NULL
        CHECK (amount >= 0),

      cash_received REAL,

      change_amount REAL,

      reference_number TEXT,

      created_by INTEGER,

      created_at TEXT NOT NULL,

      updated_by INTEGER,

      updated_at TEXT,

      FOREIGN KEY (job_order_id)
        REFERENCES job_orders(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payments_job_order_id
      ON payments(job_order_id);

    CREATE INDEX IF NOT EXISTS idx_payments_created_at
      ON payments(created_at);
  `);
}

async function migrateToVersion7(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    ALTER TABLE payments
    RENAME TO payments_old;

    CREATE TABLE payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      job_order_id INTEGER NOT NULL,

      payment_method TEXT NOT NULL
        CHECK (
          payment_method IN (
            'cash',
            'gcash',
            'other'
          )
        ),

      amount REAL NOT NULL
        CHECK (amount >= 0),

      cash_received REAL,

      change_amount REAL,

      reference_number TEXT,

      payment_note TEXT,

      created_by INTEGER,

      created_at TEXT NOT NULL,

      updated_by INTEGER,

      updated_at TEXT,

      FOREIGN KEY (job_order_id)
        REFERENCES job_orders(id)
        ON DELETE CASCADE
    );

    INSERT INTO payments (
      id,
      job_order_id,
      payment_method,
      amount,
      cash_received,
      change_amount,
      reference_number,
      payment_note,
      created_by,
      created_at,
      updated_by,
      updated_at
    )
    SELECT
      id,
      job_order_id,
      payment_method,
      amount,
      cash_received,
      change_amount,
      reference_number,
      NULL,
      created_by,
      created_at,
      updated_by,
      updated_at
    FROM payments_old;

    DROP TABLE payments_old;

    CREATE INDEX IF NOT EXISTS idx_payments_job_order_id
      ON payments(job_order_id);

    CREATE INDEX IF NOT EXISTS idx_payments_created_at
      ON payments(created_at);
  `);
}

async function migrateToVersion8(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      full_name TEXT NOT NULL,

      username TEXT NOT NULL UNIQUE,

      password_hash TEXT NOT NULL,

      role TEXT NOT NULL
        CHECK (
          role IN (
            'admin',
            'staff'
          )
        ),

      is_active INTEGER NOT NULL DEFAULT 1,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_username
      ON users(username);

    CREATE INDEX IF NOT EXISTS idx_users_role
      ON users(role);

    CREATE INDEX IF NOT EXISTS idx_users_active
      ON users(is_active);
  `);
}
