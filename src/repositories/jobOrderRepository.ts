import { getDatabase } from "@/database";
import { doAction } from "@/hooks/actions";
import {
  DiscountType,
  JobOrder,
  JobOrderDraft,
  JobOrderDraftItem,
  JobOrderItem,
  Payment,
  PaymentInput,
  PaymentMethod,
  PaymentStatus,
} from "@/models/jobOrder";

import {
  recordInventoryReturnsForJobOrderInTransaction,
  recordInventorySalesInTransaction,
} from "@/repositories/inventoryRepository";

type CustomerRow = {
  id: number;
  name: string;
};

type ProductRow = {
  id: number;
  name: string;
  price: number;
  is_active: number;
};

type ServiceRow = {
  id: number;
  name: string;
  price: number;
  is_active: number;
};

type BundleRow = {
  id: number;
  name: string;
  price: number;
  is_active: number;
};

type BundleItemRow = {
  id: number;
  bundle_id: number;
  item_type: "product" | "service";
  item_id: number;
  quantity: number;
  unit_price: number;
};

type JobOrderRow = {
  id: number;
  job_order_number: string;
  customer_id: number;
  subtotal: number;
  discount_type: DiscountType | null;
  discount_value: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  is_voided: number;
  voided_by: number | null;
  voided_at: string | null;
  void_reason: string | null;
  notes: string;
  created_by: number | null;
  created_at: string;
  updated_by: number | null;
  updated_at: string;
};

type JobOrderItemRow = {
  id: number;
  job_order_id: number;
  item_type: "product" | "service" | "bundle";
  item_id: number;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
};

type PaymentRow = {
  id: number;
  job_order_id: number;
  payment_method: PaymentMethod;
  amount: number;
  cash_received: number | null;
  change_amount: number | null;
  reference_number: string | null;
  payment_note: string | null;
  created_by: number | null;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
};

type UserAuthorizationRow = {
  id: number;
  role: "admin" | "staff";
  is_active: number;
};

export type JobOrderListItem = JobOrder & {
  customerName: string;
};

export type CreateJobOrderResult = {
  jobOrder: JobOrder;
  items: JobOrderItem[];
  payment: Payment | null;
};

export type AddJobOrderPaymentResult = {
  jobOrder: JobOrder;
  payment: Payment;
};

export type JobOrderTotals = {
  subtotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
};

export async function createJobOrder(
  draft: JobOrderDraft,
  paymentInput?: PaymentInput,
  createdBy: number | null = null,
): Promise<CreateJobOrderResult> {
  validateDraft(draft);

  const db = await getDatabase();

  let result: CreateJobOrderResult | null = null;

  const inventorySales: Awaited<
    ReturnType<typeof recordInventorySalesInTransaction>
  > = [];

  await db.withTransactionAsync(async () => {
    const customer = await db.getFirstAsync<CustomerRow>(
      `
        SELECT
          id,
          name
        FROM customers
        WHERE id = ?
          AND is_active = 1
        LIMIT 1;
      `,
      draft.customerId,
    );

    if (!customer) {
      throw new Error(
        "The selected customer could not be found or is inactive.",
      );
    }

    const resolvedItems = await resolveDraftItems(db, draft.items);

    if (resolvedItems.length === 0) {
      throw new Error("Please add at least one item to the order.");
    }

    const subtotal = roundCurrency(
      resolvedItems.reduce(
        (sum, item) => sum + calculateLineTotal(item.unitPrice, item.quantity),
        0,
      ),
    );

    const discountAmount = calculateDiscountAmount(
      subtotal,
      draft.discountType,
      draft.discountValue,
    );

    const total = roundCurrency(Math.max(subtotal - discountAmount, 0));

    validatePaymentInput(paymentInput, total);

    const amountPaid = paymentInput ? roundCurrency(paymentInput.amount) : 0;

    const balance = roundCurrency(Math.max(total - amountPaid, 0));

    const paymentStatus = calculatePaymentStatus(total, amountPaid);

    /*
     * We intentionally create the Job Order first inside the SAME
     * transaction. If inventory validation/deduction fails later,
     * the entire transaction rolls back, including this Job Order.
     */
    const temporaryNumber = `TEMP-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    const insertResult = await db.runAsync(
      `
        INSERT INTO job_orders (
          job_order_number,
          customer_id,
          subtotal,
          discount_type,
          discount_value,
          discount_amount,
          total,
          amount_paid,
          balance,
          payment_status,
          is_voided,
          voided_by,
          voided_at,
          void_reason,
          notes,
          created_by,
          created_at,
          updated_by,
          updated_at
        )
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          0,
          NULL,
          NULL,
          NULL,
          ?,
          ?,
          ?,
          NULL,
          ?
        );
      `,
      temporaryNumber,
      draft.customerId,
      subtotal,
      draft.discountType,
      draft.discountValue,
      discountAmount,
      total,
      amountPaid,
      balance,
      paymentStatus,
      draft.notes.trim(),
      createdBy,
      now(),
      now(),
    );

    const jobOrderId = Number(insertResult.lastInsertRowId);

    const jobOrderNumber = `JO-${jobOrderId.toString().padStart(6, "0")}`;

    await db.runAsync(
      `
        UPDATE job_orders
        SET
          job_order_number = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      jobOrderNumber,
      now(),
      jobOrderId,
    );

    /*
     * Build all inventory requirements from the actual resolved JO items.
     *
     * Direct product:
     *   Product quantity = JO quantity
     *
     * Bundle:
     *   Product quantity = bundle component quantity × JO bundle quantity
     *
     * Services do not affect inventory.
     *
     * Multiple lines using the same product are aggregated before
     * inventory is changed.
     */
    const inventoryRequirements = await buildInventoryRequirements(
      db,
      resolvedItems,
    );

    if (inventoryRequirements.length > 0) {
      const saleInputs: InventorySaleInput[] = inventoryRequirements.map(
        (requirement) => ({
          productId: requirement.productId,
          quantity: requirement.quantity,
          jobOrderId,
          reference: jobOrderNumber,
          notes: "",
          createdBy,
        }),
      );

      const sales = await recordInventorySalesInTransaction(db, saleInputs);

      inventorySales.push(...sales);
    }

    for (const item of resolvedItems) {
      await db.runAsync(
        `
          INSERT INTO job_order_items (
            job_order_id,
            item_type,
            item_id,
            item_name,
            unit_price,
            quantity,
            line_total,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        jobOrderId,
        item.itemType,
        item.itemId,
        item.itemName,
        item.unitPrice,
        item.quantity,
        calculateLineTotal(item.unitPrice, item.quantity),
        now(),
      );
    }

    let payment: Payment | null = null;

    if (paymentInput && paymentInput.amount > 0) {
      const paymentResult = await db.runAsync(
        `
          INSERT INTO payments (
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
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            NULL,
            NULL
          );
        `,
        jobOrderId,
        paymentInput.paymentMethod,
        amountPaid,
        paymentInput.paymentMethod === "cash"
          ? (paymentInput.cashReceived ?? amountPaid)
          : null,
        paymentInput.paymentMethod === "cash"
          ? calculateChange(paymentInput.cashReceived ?? amountPaid, amountPaid)
          : null,
        paymentInput.referenceNumber?.trim() || null,
        paymentInput.paymentNote?.trim() || null,
        createdBy,
        now(),
      );

      const paymentId = Number(paymentResult.lastInsertRowId);

      const paymentRow = await db.getFirstAsync<PaymentRow>(
        `
          SELECT
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
          FROM payments
          WHERE id = ?
          LIMIT 1;
        `,
        paymentId,
      );

      if (paymentRow) {
        payment = mapPaymentRow(paymentRow);
      }
    }

    const jobOrderRow = await db.getFirstAsync<JobOrderRow>(
      `
        SELECT
          id,
          job_order_number,
          customer_id,
          subtotal,
          discount_type,
          discount_value,
          discount_amount,
          total,
          amount_paid,
          balance,
          payment_status,
          is_voided,
          voided_by,
          voided_at,
          void_reason,
          notes,
          created_by,
          created_at,
          updated_by,
          updated_at
        FROM job_orders
        WHERE id = ?
        LIMIT 1;
      `,
      jobOrderId,
    );

    if (!jobOrderRow) {
      throw new Error("The Job Order was created but could not be loaded.");
    }

    const itemRows = await db.getAllAsync<JobOrderItemRow>(
      `
        SELECT
          id,
          job_order_id,
          item_type,
          item_id,
          item_name,
          unit_price,
          quantity,
          line_total,
          created_at
        FROM job_order_items
        WHERE job_order_id = ?
        ORDER BY id ASC;
      `,
      jobOrderId,
    );

    result = {
      jobOrder: mapJobOrderRow(jobOrderRow),
      items: itemRows.map(mapJobOrderItemRow),
      payment,
    };
  });

  if (!result) {
    throw new Error("Unable to create the Job Order.");
  }

  /*
   * Inventory audit actions are deliberately dispatched ONLY after
   * the Job Order transaction has committed successfully.
   *
   * This prevents an audit entry from being created for inventory
   * that was later rolled back.
   */
  for (const operation of inventorySales) {
    const product = await db.getFirstAsync<ProductRow>(
      `
        SELECT
          id,
          name,
          price,
          is_active
        FROM products
        WHERE id = ?
        LIMIT 1;
      `,
      operation.inventory.productId,
    );

    doAction("inventory.stock_sold", {
      inventory: operation.inventory,
      movement: operation.movement,
      productName: product?.name ?? "Unknown Product",
    });
  }

  return result;
}

export async function addJobOrderPayment(
  jobOrderId: number,
  paymentInput: PaymentInput,
  createdBy: number | null = null,
): Promise<AddJobOrderPaymentResult> {
  const db = await getDatabase();

  let result: AddJobOrderPaymentResult | null = null;

  await db.withTransactionAsync(async () => {
    const jobOrderRow = await db.getFirstAsync<JobOrderRow>(
      `
        SELECT
          id,
          job_order_number,
          customer_id,
          subtotal,
          discount_type,
          discount_value,
          discount_amount,
          total,
          amount_paid,
          balance,
          payment_status,
          is_voided,
          voided_by,
          voided_at,
          void_reason,
          notes,
          created_by,
          created_at,
          updated_by,
          updated_at
        FROM job_orders
        WHERE id = ?
        LIMIT 1;
      `,
      jobOrderId,
    );

    if (!jobOrderRow) {
      throw new Error("The Job Order could not be found.");
    }

    const jobOrder = mapJobOrderRow(jobOrderRow);

    if (jobOrder.isVoided) {
      throw new Error("A voided Job Order cannot receive a payment.");
    }

    if (jobOrder.balance <= 0) {
      throw new Error("This Job Order has no remaining balance.");
    }

    validateAdditionalPaymentInput(paymentInput, jobOrder.balance);

    const amount = roundCurrency(paymentInput.amount);
    const newAmountPaid = roundCurrency(jobOrder.amountPaid + amount);
    const newBalance = roundCurrency(
      Math.max(jobOrder.total - newAmountPaid, 0),
    );
    const newPaymentStatus = calculatePaymentStatus(
      jobOrder.total,
      newAmountPaid,
    );

    const paymentResult = await db.runAsync(
      `
        INSERT INTO payments (
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
        VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          NULL,
          NULL
        );
      `,
      jobOrderId,
      paymentInput.paymentMethod,
      amount,
      paymentInput.paymentMethod === "cash"
        ? (paymentInput.cashReceived ?? amount)
        : null,
      paymentInput.paymentMethod === "cash"
        ? calculateChange(paymentInput.cashReceived ?? amount, amount)
        : null,
      paymentInput.referenceNumber?.trim() || null,
      paymentInput.paymentNote?.trim() || null,
      createdBy,
      now(),
    );

    const paymentId = Number(paymentResult.lastInsertRowId);

    await db.runAsync(
      `
        UPDATE job_orders
        SET
          amount_paid = ?,
          balance = ?,
          payment_status = ?,
          updated_by = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      newAmountPaid,
      newBalance,
      newPaymentStatus,
      createdBy,
      now(),
      jobOrderId,
    );

    const paymentRow = await db.getFirstAsync<PaymentRow>(
      `
        SELECT
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
        FROM payments
        WHERE id = ?
        LIMIT 1;
      `,
      paymentId,
    );

    if (!paymentRow) {
      throw new Error("The payment was saved but could not be loaded.");
    }

    const updatedJobOrderRow = await db.getFirstAsync<JobOrderRow>(
      `
        SELECT
          id,
          job_order_number,
          customer_id,
          subtotal,
          discount_type,
          discount_value,
          discount_amount,
          total,
          amount_paid,
          balance,
          payment_status,
          is_voided,
          voided_by,
          voided_at,
          void_reason,
          notes,
          created_by,
          created_at,
          updated_by,
          updated_at
        FROM job_orders
        WHERE id = ?
        LIMIT 1;
      `,
      jobOrderId,
    );

    if (!updatedJobOrderRow) {
      throw new Error(
        "The payment was saved but the updated Job Order could not be loaded.",
      );
    }

    result = {
      jobOrder: mapJobOrderRow(updatedJobOrderRow),
      payment: mapPaymentRow(paymentRow),
    };
  });

  if (!result) {
    throw new Error("Unable to save the payment.");
  }

  return result;
}

export async function voidJobOrder(
  jobOrderId: number,
  voidedBy: number,
  voidReason: string,
): Promise<JobOrder> {
  const cleanReason = voidReason.trim();

  if (!cleanReason) {
    throw new Error("Please enter a reason for voiding this Job Order.");
  }

  if (!Number.isInteger(jobOrderId) || jobOrderId <= 0) {
    throw new Error("The Job Order ID is invalid.");
  }

  if (!Number.isInteger(voidedBy) || voidedBy <= 0) {
    throw new Error(
      "A valid administrator is required to void this Job Order.",
    );
  }

  const db = await getDatabase();

  let result: JobOrder | null = null;

  const inventoryReturns: Awaited<
    ReturnType<typeof recordInventoryReturnsForJobOrderInTransaction>
  > = [];

  await db.withTransactionAsync(async () => {
    const user = await db.getFirstAsync<UserAuthorizationRow>(
      `
        SELECT
          id,
          role,
          is_active
        FROM users
        WHERE id = ?
        LIMIT 1;
      `,
      voidedBy,
    );

    if (!user || user.role !== "admin" || user.is_active !== 1) {
      throw new Error("Only an active administrator can void a Job Order.");
    }

    const jobOrderRow = await db.getFirstAsync<JobOrderRow>(
      `
        SELECT
          id,
          job_order_number,
          customer_id,
          subtotal,
          discount_type,
          discount_value,
          discount_amount,
          total,
          amount_paid,
          balance,
          payment_status,
          is_voided,
          voided_by,
          voided_at,
          void_reason,
          notes,
          created_by,
          created_at,
          updated_by,
          updated_at
        FROM job_orders
        WHERE id = ?
        LIMIT 1;
      `,
      jobOrderId,
    );

    if (!jobOrderRow) {
      throw new Error("The Job Order could not be found.");
    }

    if (jobOrderRow.is_voided === 1) {
      throw new Error("This Job Order has already been voided.");
    }

    /*
     * Return the actual inventory sold by this Job Order.
     *
     * We intentionally use the recorded sale movements instead of
     * reconstructing the current bundle definition. This ensures that
     * voiding reverses exactly what was deducted when the JO was created.
     */
    const returns = await recordInventoryReturnsForJobOrderInTransaction(
      db,
      jobOrderId,
      jobOrderRow.job_order_number,
      voidedBy,
    );

    inventoryReturns.push(...returns);

    const timestamp = now();

    const updateResult = await db.runAsync(
      `
        UPDATE job_orders
        SET
          is_voided = 1,
          voided_by = ?,
          voided_at = ?,
          void_reason = ?,
          updated_by = ?,
          updated_at = ?
        WHERE id = ?
          AND is_voided = 0;
      `,
      voidedBy,
      timestamp,
      cleanReason,
      voidedBy,
      timestamp,
      jobOrderId,
    );

    if (updateResult.changes !== 1) {
      throw new Error(
        "The Job Order could not be voided. It may have already been voided.",
      );
    }

    const updatedRow = await db.getFirstAsync<JobOrderRow>(
      `
        SELECT
          id,
          job_order_number,
          customer_id,
          subtotal,
          discount_type,
          discount_value,
          discount_amount,
          total,
          amount_paid,
          balance,
          payment_status,
          is_voided,
          voided_by,
          voided_at,
          void_reason,
          notes,
          created_by,
          created_at,
          updated_by,
          updated_at
        FROM job_orders
        WHERE id = ?
        LIMIT 1;
      `,
      jobOrderId,
    );

    if (!updatedRow) {
      throw new Error("The Job Order was voided but could not be loaded.");
    }

    result = mapJobOrderRow(updatedRow);
  });

  if (!result) {
    throw new Error("Unable to void the Job Order.");
  }

  /*
   * Inventory audit actions are deliberately dispatched only after
   * the entire void transaction has committed successfully.
   */
  for (const operation of inventoryReturns) {
    const product = await db.getFirstAsync<ProductRow>(
      `
        SELECT
          id,
          name,
          price,
          is_active
        FROM products
        WHERE id = ?
        LIMIT 1;
      `,
      operation.inventory.productId,
    );

    doAction("inventory.stock_returned", {
      inventory: operation.inventory,
      movement: operation.movement,
      productName: product?.name ?? "Unknown Product",
    });
  }

  return result;
}

export async function getJobOrders(): Promise<JobOrderListItem[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<
    JobOrderRow & {
      customer_name: string;
    }
  >(
    `
      SELECT
        jo.id,
        jo.job_order_number,
        jo.customer_id,
        jo.subtotal,
        jo.discount_type,
        jo.discount_value,
        jo.discount_amount,
        jo.total,
        jo.amount_paid,
        jo.balance,
        jo.payment_status,
        jo.is_voided,
        jo.voided_by,
        jo.voided_at,
        jo.void_reason,
        jo.notes,
        jo.created_by,
        jo.created_at,
        jo.updated_by,
        jo.updated_at,
        c.name AS customer_name
      FROM job_orders jo
      INNER JOIN customers c
        ON c.id = jo.customer_id
      ORDER BY jo.id DESC;
    `,
  );

  return rows.map((row) => ({
    ...mapJobOrderRow(row),
    customerName: row.customer_name,
  }));
}

export async function getJobOrderById(id: number): Promise<JobOrder | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<JobOrderRow>(
    `
      SELECT
        id,
        job_order_number,
        customer_id,
        subtotal,
        discount_type,
        discount_value,
        discount_amount,
        total,
        amount_paid,
        balance,
        payment_status,
        is_voided,
        voided_by,
        voided_at,
        void_reason,
        notes,
        created_by,
        created_at,
        updated_by,
        updated_at
      FROM job_orders
      WHERE id = ?
      LIMIT 1;
    `,
    id,
  );

  return row ? mapJobOrderRow(row) : null;
}

export async function getJobOrderItems(
  jobOrderId: number,
): Promise<JobOrderItem[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<JobOrderItemRow>(
    `
      SELECT
        id,
        job_order_id,
        item_type,
        item_id,
        item_name,
        unit_price,
        quantity,
        line_total,
        created_at
      FROM job_order_items
      WHERE job_order_id = ?
      ORDER BY id ASC;
    `,
    jobOrderId,
  );

  return rows.map(mapJobOrderItemRow);
}

export async function getJobOrderPayments(
  jobOrderId: number,
): Promise<Payment[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<PaymentRow>(
    `
      SELECT
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
      FROM payments
      WHERE job_order_id = ?
      ORDER BY id ASC;
    `,
    jobOrderId,
  );

  return rows.map(mapPaymentRow);
}

export function calculateJobOrderTotals(
  items: JobOrderDraftItem[],
  discountType: DiscountType | null,
  discountValue: number,
  amountPaid = 0,
): JobOrderTotals {
  const subtotal = roundCurrency(
    items.reduce(
      (sum, item) => sum + calculateLineTotal(item.unitPrice, item.quantity),
      0,
    ),
  );

  const discountAmount = calculateDiscountAmount(
    subtotal,
    discountType,
    discountValue,
  );

  const total = roundCurrency(Math.max(subtotal - discountAmount, 0));

  const paid = roundCurrency(Math.max(amountPaid, 0));

  const balance = roundCurrency(Math.max(total - paid, 0));

  return {
    subtotal,
    discountAmount,
    total,
    amountPaid: paid,
    balance,
    paymentStatus: calculatePaymentStatus(total, paid),
  };
}

type InventoryRequirement = {
  productId: number;
  quantity: number;
};

type InventorySaleInput = {
  productId: number;
  quantity: number;
  jobOrderId: number;
  reference: string;
  notes: string;
  createdBy: number | null;
};

async function buildInventoryRequirements(
  db: Awaited<ReturnType<typeof getDatabase>>,
  items: JobOrderDraftItem[],
): Promise<InventoryRequirement[]> {
  const requirements = new Map<number, number>();

  for (const item of items) {
    if (item.itemType === "product") {
      addInventoryRequirement(requirements, item.itemId, item.quantity);
      continue;
    }

    if (item.itemType !== "bundle") {
      continue;
    }

    const bundleItems = await db.getAllAsync<BundleItemRow>(
      `
        SELECT
          item_type,
          item_id,
          quantity
        FROM bundle_items
        WHERE bundle_id = ?
      `,
      item.itemId,
    );

    for (const bundleItem of bundleItems) {
      if (bundleItem.item_type !== "product") {
        continue;
      }

      const requiredQuantity = bundleItem.quantity * item.quantity;

      addInventoryRequirement(
        requirements,
        bundleItem.item_id,
        requiredQuantity,
      );
    }
  }

  return Array.from(requirements.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function addInventoryRequirement(
  requirements: Map<number, number>,
  productId: number,
  quantity: number,
): void {
  const existing = requirements.get(productId) ?? 0;

  requirements.set(productId, existing + quantity);
}

function validateDraft(draft: JobOrderDraft): void {
  if (!draft.customerId) {
    throw new Error("Please select a customer before completing the order.");
  }

  if (!draft.items.length) {
    throw new Error("Please add at least one item to the order.");
  }

  if (
    draft.discountType === "percentage" &&
    (draft.discountValue < 0 || draft.discountValue > 100)
  ) {
    throw new Error("Percentage discount must be between 0 and 100.");
  }

  if (draft.discountType === "fixed" && draft.discountValue < 0) {
    throw new Error("Fixed discount cannot be negative.");
  }
}

async function resolveDraftItems(
  db: Awaited<ReturnType<typeof getDatabase>>,
  items: JobOrderDraftItem[],
): Promise<JobOrderDraftItem[]> {
  const resolvedItems: JobOrderDraftItem[] = [];

  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid quantity for ${item.itemName}.`);
    }

    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error(`Invalid price for ${item.itemName}.`);
    }

    let itemName = item.itemName;
    let unitPrice = item.unitPrice;

    if (item.itemType === "product") {
      const product = await db.getFirstAsync<ProductRow>(
        `
          SELECT
            id,
            name,
            price,
            is_active
          FROM products
          WHERE id = ?
            AND is_active = 1
          LIMIT 1;
        `,
        item.itemId,
      );

      if (!product) {
        throw new Error(`Product "${item.itemName}" is no longer available.`);
      }

      itemName = product.name;
      unitPrice = product.price;
    }

    if (item.itemType === "service") {
      const service = await db.getFirstAsync<ServiceRow>(
        `
          SELECT
            id,
            name,
            price,
            is_active
          FROM services
          WHERE id = ?
            AND is_active = 1
          LIMIT 1;
        `,
        item.itemId,
      );

      if (!service) {
        throw new Error(`Service "${item.itemName}" is no longer available.`);
      }

      itemName = service.name;
      unitPrice = service.price;
    }

    if (item.itemType === "bundle") {
      const bundle = await db.getFirstAsync<BundleRow>(
        `
          SELECT
            id,
            name,
            price,
            is_active
          FROM bundles
          WHERE id = ?
            AND is_active = 1
          LIMIT 1;
        `,
        item.itemId,
      );

      if (!bundle) {
        throw new Error(`Bundle "${item.itemName}" is no longer available.`);
      }

      itemName = bundle.name;
      unitPrice = bundle.price;
    }

    resolvedItems.push({
      itemType: item.itemType,
      itemId: item.itemId,
      itemName,
      unitPrice: roundCurrency(unitPrice),
      quantity: item.quantity,
    });
  }

  return resolvedItems;
}

function validatePaymentInput(
  paymentInput: PaymentInput | undefined,
  total: number,
): void {
  if (!paymentInput) {
    return;
  }

  if (!Number.isFinite(paymentInput.amount) || paymentInput.amount < 0) {
    throw new Error("Payment amount must be a valid amount.");
  }

  if (paymentInput.amount > total) {
    throw new Error("Payment amount cannot be greater than the order total.");
  }

  if (paymentInput.paymentMethod === "cash") {
    const cashReceived = paymentInput.cashReceived ?? paymentInput.amount;

    if (!Number.isFinite(cashReceived) || cashReceived < paymentInput.amount) {
      throw new Error(
        "Cash received must be equal to or greater than the payment amount.",
      );
    }
  }

  if (
    paymentInput.paymentMethod === "other" &&
    !paymentInput.paymentNote?.trim()
  ) {
    throw new Error("Please enter how the Other payment was made.");
  }
}

function validateAdditionalPaymentInput(
  paymentInput: PaymentInput,
  balance: number,
): void {
  if (!Number.isFinite(paymentInput.amount) || paymentInput.amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  if (paymentInput.amount > balance) {
    throw new Error(
      "Payment amount cannot be greater than the remaining balance.",
    );
  }

  if (paymentInput.paymentMethod === "cash") {
    const cashReceived = paymentInput.cashReceived ?? paymentInput.amount;

    if (!Number.isFinite(cashReceived) || cashReceived < paymentInput.amount) {
      throw new Error(
        "Cash received must be equal to or greater than the payment amount.",
      );
    }
  }

  if (
    paymentInput.paymentMethod === "other" &&
    !paymentInput.paymentNote?.trim()
  ) {
    throw new Error("Please enter how the Other payment was made.");
  }
}

function calculateLineTotal(unitPrice: number, quantity: number): number {
  return roundCurrency(unitPrice * quantity);
}

function calculateDiscountAmount(
  subtotal: number,
  discountType: DiscountType | null,
  discountValue: number,
): number {
  if (!discountType || discountValue <= 0) {
    return 0;
  }

  if (discountType === "percentage") {
    return roundCurrency(subtotal * (discountValue / 100));
  }

  return roundCurrency(Math.min(discountValue, subtotal));
}

function calculatePaymentStatus(
  total: number,
  amountPaid: number,
): PaymentStatus {
  if (total <= 0) {
    return "paid";
  }

  if (amountPaid >= total) {
    return "paid";
  }

  if (amountPaid > 0) {
    return "partially_paid";
  }

  return "unpaid";
}

function calculateChange(cashReceived: number, amount: number): number {
  return roundCurrency(Math.max(cashReceived - amount, 0));
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function now(): string {
  return new Date().toISOString();
}

function mapJobOrderRow(row: JobOrderRow): JobOrder {
  return {
    id: row.id,
    jobOrderNumber: row.job_order_number,
    customerId: row.customer_id,
    subtotal: row.subtotal,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    discountAmount: row.discount_amount,
    total: row.total,
    amountPaid: row.amount_paid,
    balance: row.balance,
    paymentStatus: row.payment_status,
    isVoided: row.is_voided === 1,
    voidedBy: row.voided_by,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

function mapJobOrderItemRow(row: JobOrderItemRow): JobOrderItem {
  return {
    id: row.id,
    jobOrderId: row.job_order_id,
    itemType: row.item_type,
    itemId: row.item_id,
    itemName: row.item_name,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    lineTotal: row.line_total,
    createdAt: row.created_at,
  };
}

function mapPaymentRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    jobOrderId: row.job_order_id,
    paymentMethod: row.payment_method,
    amount: row.amount,
    cashReceived: row.cash_received,
    changeAmount: row.change_amount,
    referenceNumber: row.reference_number,
    paymentNote: row.payment_note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}
