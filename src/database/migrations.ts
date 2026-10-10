import { hashPassword } from "../utils/password";
import { getDatabase } from "./database";

const DATABASE_VERSION = 15;

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

    if (currentVersion < 9) {
      await migrateToVersion9(db);
    }

    if (currentVersion < 10) {
      await migrateToVersion10(db);
    }

    if (currentVersion < 11) {
      await migrateToVersion11(db);
    }

    if (currentVersion < 12) {
      await migrateToVersion12(db);
    }

    if (currentVersion < 13) {
      await migrateToVersion13(db);
    }

    if (currentVersion < 14) {
      await migrateToVersion14(db);
    }

    if (currentVersion < 15) {
      await migrateToVersion15(db);
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

async function migrateToVersion9(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      name TEXT NOT NULL UNIQUE,

      description TEXT NOT NULL DEFAULT '',

      is_active INTEGER NOT NULL DEFAULT 1,

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expense_categories_name
      ON expense_categories(name);

    CREATE INDEX IF NOT EXISTS idx_expense_categories_active
      ON expense_categories(is_active);

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      category_id INTEGER NOT NULL,

      description TEXT NOT NULL DEFAULT '',

      amount REAL NOT NULL DEFAULT 0
        CHECK (amount >= 0),

      expense_date TEXT NOT NULL,

      notes TEXT NOT NULL DEFAULT '',

      created_by INTEGER,

      created_at TEXT NOT NULL,

      updated_by INTEGER,

      updated_at TEXT,

      is_voided INTEGER NOT NULL DEFAULT 0,

      voided_by INTEGER,

      voided_at TEXT,

      void_reason TEXT,

      FOREIGN KEY (category_id)
        REFERENCES expense_categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_category_id
      ON expenses(category_id);

    CREATE INDEX IF NOT EXISTS idx_expenses_expense_date
      ON expenses(expense_date);

    CREATE INDEX IF NOT EXISTS idx_expenses_created_at
      ON expenses(created_at);

    CREATE INDEX IF NOT EXISTS idx_expenses_is_voided
      ON expenses(is_voided);

    CREATE INDEX IF NOT EXISTS idx_expenses_category_date
      ON expenses(category_id, expense_date);

    INSERT OR IGNORE INTO expense_categories (
      name,
      description,
      is_active,
      created_at,
      updated_at
    )
    VALUES
      ('Electricity', '', 1, datetime('now'), datetime('now')),
      ('Water', '', 1, datetime('now'), datetime('now')),
      ('Rent', '', 1, datetime('now'), datetime('now')),
      ('Supplies', '', 1, datetime('now'), datetime('now')),
      ('Maintenance', '', 1, datetime('now'), datetime('now')),
      ('Other', '', 1, datetime('now'), datetime('now'));
  `);
}

async function migrateToVersion10(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    INSERT OR IGNORE INTO expense_categories (
      name,
      description,
      is_active,
      created_at,
      updated_at
    )
    VALUES
      (
        'Detergent & Chemicals',
        '',
        1,
        datetime('now'),
        datetime('now')
      ),
      (
        'Equipment',
        '',
        1,
        datetime('now'),
        datetime('now')
      ),
      (
        'Salaries & Wages',
        '',
        1,
        datetime('now'),
        datetime('now')
      ),
      (
        'Transportation',
        '',
        1,
        datetime('now'),
        datetime('now')
      ),
      (
        'Internet & Phone',
        '',
        1,
        datetime('now'),
        datetime('now')
      ),
      (
        'Permits & Licenses',
        '',
        1,
        datetime('now'),
        datetime('now')
      );
  `);
}

async function migrateToVersion11(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      user_id INTEGER,

      user_name TEXT NOT NULL,

      action TEXT NOT NULL,

      entity_type TEXT NOT NULL,

      entity_id INTEGER,

      entity_name TEXT NOT NULL DEFAULT '',

      changes TEXT NOT NULL DEFAULT '{}',

      created_at TEXT NOT NULL,

      FOREIGN KEY (user_id)
        REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
      ON audit_logs(user_id);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_action
      ON audit_logs(action);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type
      ON audit_logs(entity_type);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id
      ON audit_logs(entity_id);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
      ON audit_logs(created_at);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
      ON audit_logs(entity_type, entity_id);
  `);
}

async function migrateToVersion12(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      product_id INTEGER NOT NULL UNIQUE,

      is_tracking_enabled INTEGER NOT NULL DEFAULT 1,

      unit TEXT NOT NULL DEFAULT 'piece',

      current_quantity REAL NOT NULL DEFAULT 0,

      low_stock_level REAL NOT NULL DEFAULT 0,

      cost_per_unit REAL NOT NULL DEFAULT 0,

      sku TEXT NOT NULL DEFAULT '',

      supplier TEXT NOT NULL DEFAULT '',

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL,

      FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id
      ON inventory_items(product_id);

    CREATE INDEX IF NOT EXISTS idx_inventory_items_tracking_enabled
      ON inventory_items(is_tracking_enabled);

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      inventory_item_id INTEGER NOT NULL,

      movement_type TEXT NOT NULL
        CHECK (
          movement_type IN (
            'stock_received',
            'sale',
            'return',
            'adjustment',
            'stock_removed'
          )
        ),

      quantity REAL NOT NULL,

      balance_after REAL NOT NULL,

      unit_cost REAL NOT NULL DEFAULT 0,

      supplier TEXT NOT NULL DEFAULT '',

      reference TEXT NOT NULL DEFAULT '',

      reason TEXT NOT NULL DEFAULT '',

      notes TEXT NOT NULL DEFAULT '',

      job_order_id INTEGER,

      created_by INTEGER,

      created_at TEXT NOT NULL,

      FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items(id)
        ON DELETE CASCADE,

      FOREIGN KEY (job_order_id)
        REFERENCES job_orders(id)
        ON DELETE SET NULL,

      FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_item_id
      ON inventory_movements(inventory_item_id);

    CREATE INDEX IF NOT EXISTS idx_inventory_movements_movement_type
      ON inventory_movements(movement_type);

    CREATE INDEX IF NOT EXISTS idx_inventory_movements_job_order_id
      ON inventory_movements(job_order_id);

    CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by
      ON inventory_movements(created_by);

    CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at
      ON inventory_movements(created_at);
  `);
}

async function migrateToVersion13(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),

      shop_name TEXT NOT NULL DEFAULT '',

      shop_address TEXT NOT NULL DEFAULT '',

      shop_contact TEXT NOT NULL DEFAULT '',

      claim_stub_message TEXT NOT NULL DEFAULT
        'PLEASE DO NOT LOSE THIS TICKET. PRESENT THIS CLAIM STUB WHEN CLAIMING YOUR LAUNDRY.',

      receipt_paper_width TEXT NOT NULL DEFAULT '58mm'
        CHECK (
          receipt_paper_width IN ('58mm', '80mm')
        ),

      created_at TEXT NOT NULL,

      updated_at TEXT NOT NULL
    );

    INSERT OR IGNORE INTO app_settings (
      id,
      shop_name,
      shop_address,
      shop_contact,
      claim_stub_message,
      receipt_paper_width,
      created_at,
      updated_at
    )
    VALUES (
      1,
      '',
      '',
      '',
      'PLEASE DO NOT LOSE THIS TICKET. PRESENT THIS CLAIM STUB WHEN CLAIMING YOUR LAUNDRY.',
      '58mm',
      datetime('now'),
      datetime('now')
    );
  `);
}

async function migrateToVersion14(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS promotion_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),

      enabled INTEGER NOT NULL DEFAULT 0
        CHECK (enabled IN (0, 1)),

      promotions_json TEXT NOT NULL DEFAULT '[]',

      fetched_at TEXT NOT NULL,

      updated_at TEXT NOT NULL
    );
  `);
}

async function migrateToVersion15(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<void> {
  const existingUser = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM users LIMIT 1;",
  );

  if (existingUser) {
    return;
  }

  const passwordHash = await hashPassword("default-adminpassword654321!");

  const now = new Date().toISOString();

  await db.runAsync(
    `
      INSERT INTO users (
        full_name,
        username,
        password_hash,
        role,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 1, ?, ?);
    `,
    "Default Administrator",
    "default-admin",
    passwordHash,
    "admin",
    now,
    now,
  );
}
