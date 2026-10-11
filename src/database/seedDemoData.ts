import { getDatabase } from "@/database/database";

/**
 * Inserts the requested demo records into an empty business database.
 *
 * Safe to call on every app launch:
 * - Does not overwrite existing business data.
 * - Does not insert duplicate demo records.
 * - Creates inventory records with initial stock.
 * - Creates the Full Service bundle with its linked items.
 */
export async function seedDemoData(): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // Only seed when all four business tables are empty.
    const existingData = await db.getFirstAsync<{
      customerCount: number;
      productCount: number;
      serviceCount: number;
      bundleCount: number;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM customers) AS customerCount,
        (SELECT COUNT(*) FROM products) AS productCount,
        (SELECT COUNT(*) FROM services) AS serviceCount,
        (SELECT COUNT(*) FROM bundles) AS bundleCount;
    `);

    if (
      !existingData ||
      existingData.customerCount > 0 ||
      existingData.productCount > 0 ||
      existingData.serviceCount > 0 ||
      existingData.bundleCount > 0
    ) {
      return;
    }

    // 1. Demo customer
    await db.runAsync(
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
        VALUES (?, ?, ?, '', 1, ?, ?);
      `,
      "Test Customer",
      "321654987",
      "Alley 40",
      now,
      now,
    );

    // 2. Demo products
    const products = [
      { name: "Ariel Liquid", price: 15, stock: 10 },
      { name: "Champion Liquid", price: 15, stock: 10 },
    ];

    const productIds: Record<string, number> = {};

    for (const product of products) {
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
          VALUES (?, '', ?, 1, ?, ?);
        `,
        product.name,
        product.price,
        now,
        now,
      );

      const productId = result.lastInsertRowId;
      productIds[product.name] = productId;

      // Create the inventory profile with the requested initial stock.
      const inventoryResult = await db.runAsync(
        `
          INSERT INTO inventory_items (
            product_id,
            is_tracking_enabled,
            unit,
            current_quantity,
            low_stock_level,
            cost_per_unit,
            sku,
            supplier,
            created_at,
            updated_at
          )
          VALUES (?, 1, 'piece', ?, 0, 0, '', '', ?, ?);
        `,
        productId,
        product.stock,
        now,
        now,
      );

      // Record the opening stock in inventory history.
      await db.runAsync(
        `
          INSERT INTO inventory_movements (
            inventory_item_id,
            movement_type,
            quantity,
            balance_after,
            unit_cost,
            supplier,
            reference,
            reason,
            notes,
            job_order_id,
            created_by,
            created_at
          )
          VALUES (
            ?,
            'stock_received',
            ?,
            ?,
            0,
            '',
            'DEMO-SEED',
            'Initial demo stock',
            'Opening stock inserted during first-launch demo seeding.',
            NULL,
            NULL,
            ?
          );
        `,
        inventoryResult.lastInsertRowId,
        product.stock,
        product.stock,
        now,
      );
    }

    // 3. Demo services
    const services = [
      { name: "Wash", price: 65 },
      { name: "Dry", price: 75 },
      { name: "Fold", price: 30 },
    ];

    const serviceIds: Record<string, number> = {};

    for (const service of services) {
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
          VALUES (?, '', ?, 1, ?, ?);
        `,
        service.name,
        service.price,
        now,
        now,
      );

      serviceIds[service.name] = result.lastInsertRowId;
    }

    // 4. Full Service bundle
    const bundleResult = await db.runAsync(
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
      "Full Service",
      "Wash, Dry, Fold, and Ariel Liquid",
      210,
      now,
      now,
    );

    const bundleId = bundleResult.lastInsertRowId;

    const bundleItems = [
      {
        itemType: "service",
        itemId: serviceIds["Wash"],
      },
      {
        itemType: "service",
        itemId: serviceIds["Dry"],
      },
      {
        itemType: "service",
        itemId: serviceIds["Fold"],
      },
      {
        itemType: "product",
        itemId: productIds["Ariel Liquid"],
      },
    ];

    for (const item of bundleItems) {
      await db.runAsync(
        `
          INSERT INTO bundle_items (
            bundle_id,
            item_type,
            item_id,
            quantity,
            created_at
          )
          VALUES (?, ?, ?, 1, ?);
        `,
        bundleId,
        item.itemType,
        item.itemId,
        now,
      );
    }
  });

  console.log("Demo data seeded successfully.");
}
