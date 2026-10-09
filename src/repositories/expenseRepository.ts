import { getDatabase } from "@/database";
import { doAction } from "@/hooks/actions";
import type {
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  UpdateExpenseCategoryInput,
  UpdateExpenseInput,
} from "@/models/expense";

type ExpenseCategoryRow = {
  id: number;
  name: string;
  description: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type ExpenseRow = {
  id: number;
  category_id: number;
  category_name: string;
  description: string;
  amount: number;
  expense_date: string;
  notes: string;
  created_by: number | null;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
  is_voided: number;
  voided_by: number | null;
  voided_at: string | null;
  void_reason: string | null;
};

function mapExpenseCategory(row: ExpenseCategoryRow): ExpenseCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    description: row.description,
    amount: row.amount,
    expenseDate: row.expense_date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    isVoided: row.is_voided === 1,
    voidedBy: row.voided_by,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
  };
}

/* -------------------------------------------------------------------------- */
/* Expense Categories                                                         */
/* -------------------------------------------------------------------------- */

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<ExpenseCategoryRow>(
    `
      SELECT
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM expense_categories
      ORDER BY name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapExpenseCategory);
}

export async function getActiveExpenseCategories(): Promise<ExpenseCategory[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<ExpenseCategoryRow>(
    `
      SELECT
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM expense_categories
      WHERE is_active = 1
      ORDER BY name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapExpenseCategory);
}

export async function getExpenseCategoryById(
  id: number,
): Promise<ExpenseCategory | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<ExpenseCategoryRow>(
    `
      SELECT
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM expense_categories
      WHERE id = ?;
    `,
    id,
  );

  return row ? mapExpenseCategory(row) : null;
}

export async function createExpenseCategory(
  input: CreateExpenseCategoryInput,
): Promise<ExpenseCategory> {
  const db = await getDatabase();

  const name = input.name.trim();

  if (!name) {
    throw new Error("Category name is required.");
  }

  const now = new Date().toISOString();

  try {
    const result = await db.runAsync(
      `
        INSERT INTO expense_categories (
          name,
          description,
          is_active,
          created_at,
          updated_at
        )
        VALUES (?, ?, 1, ?, ?);
      `,
      name,
      input.description?.trim() ?? "",
      now,
      now,
    );

    const category = await getExpenseCategoryById(result.lastInsertRowId);

    if (!category) {
      throw new Error(
        "Expense category was created but could not be retrieved.",
      );
    }

    return category;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      throw new Error("An expense category with this name already exists.");
    }

    throw error;
  }
}

export async function updateExpenseCategory(
  id: number,
  input: UpdateExpenseCategoryInput,
): Promise<ExpenseCategory> {
  const db = await getDatabase();

  const name = input.name.trim();

  if (!name) {
    throw new Error("Category name is required.");
  }

  const now = new Date().toISOString();

  try {
    await db.runAsync(
      `
        UPDATE expense_categories
        SET
          name = ?,
          description = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      name,
      input.description?.trim() ?? "",
      now,
      id,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      throw new Error("An expense category with this name already exists.");
    }

    throw error;
  }

  const category = await getExpenseCategoryById(id);

  if (!category) {
    throw new Error("Expense category could not be found after update.");
  }

  return category;
}

export async function setExpenseCategoryActive(
  id: number,
  isActive: boolean,
): Promise<ExpenseCategory> {
  const db = await getDatabase();

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE expense_categories
      SET
        is_active = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    isActive ? 1 : 0,
    now,
    id,
  );

  const category = await getExpenseCategoryById(id);

  if (!category) {
    throw new Error("Expense category could not be found after status update.");
  }

  return category;
}

/* -------------------------------------------------------------------------- */
/* Expenses                                                                   */
/* -------------------------------------------------------------------------- */

const EXPENSE_SELECT = `
  SELECT
    e.id,
    e.category_id,
    c.name AS category_name,
    e.description,
    e.amount,
    e.expense_date,
    e.notes,
    e.created_by,
    e.created_at,
    e.updated_by,
    e.updated_at,
    e.is_voided,
    e.voided_by,
    e.voided_at,
    e.void_reason
  FROM expenses e
  INNER JOIN expense_categories c
    ON c.id = e.category_id
`;

export async function getExpenses(): Promise<Expense[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<ExpenseRow>(
    `
      ${EXPENSE_SELECT}
      ORDER BY
        e.expense_date DESC,
        e.id DESC;
    `,
  );

  return rows.map(mapExpense);
}

export async function getExpenseById(id: number): Promise<Expense | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<ExpenseRow>(
    `
      ${EXPENSE_SELECT}
      WHERE e.id = ?;
    `,
    id,
  );

  return row ? mapExpense(row) : null;
}

export async function createExpense(
  input: CreateExpenseInput,
  createdBy: number | null = null,
): Promise<Expense> {
  const db = await getDatabase();

  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error("Expense amount must be zero or greater.");
  }

  if (!input.expenseDate.trim()) {
    throw new Error("Expense date is required.");
  }

  const category = await getExpenseCategoryById(input.categoryId);

  if (!category) {
    throw new Error("Expense category could not be found.");
  }

  if (!category.isActive) {
    throw new Error("The selected expense category is inactive.");
  }

  const now = new Date().toISOString();

  const result = await db.runAsync(
    `
      INSERT INTO expenses (
        category_id,
        description,
        amount,
        expense_date,
        notes,
        created_by,
        created_at,
        updated_by,
        updated_at,
        is_voided
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 0);
    `,
    input.categoryId,
    input.description?.trim() ?? "",
    input.amount,
    input.expenseDate.trim(),
    input.notes?.trim() ?? "",
    createdBy,
    now,
  );

  const expense = await getExpenseById(result.lastInsertRowId);

  if (!expense) {
    throw new Error("Expense was created but could not be retrieved.");
  }

  await doAction("expense.created", {
    expense,
  });

  return expense;
}

export async function updateExpense(
  id: number,
  input: UpdateExpenseInput,
  updatedBy: number | null = null,
): Promise<Expense> {
  const db = await getDatabase();

  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error("Expense amount must be zero or greater.");
  }

  if (!input.expenseDate.trim()) {
    throw new Error("Expense date is required.");
  }

  const existingExpense = await getExpenseById(id);

  if (!existingExpense) {
    throw new Error("Expense could not be found.");
  }

  if (existingExpense.isVoided) {
    throw new Error("A voided expense cannot be edited.");
  }

  const category = await getExpenseCategoryById(input.categoryId);

  if (!category) {
    throw new Error("Expense category could not be found.");
  }

  if (!category.isActive) {
    throw new Error("The selected expense category is inactive.");
  }

  const updatedCategoryId = input.categoryId;
  const updatedDescription = input.description?.trim() ?? "";
  const updatedAmount = input.amount;
  const updatedExpenseDate = input.expenseDate.trim();
  const updatedNotes = input.notes?.trim() ?? "";

  const changes: Record<
    string,
    {
      from: unknown;
      to: unknown;
    }
  > = {};

  if (existingExpense.categoryId !== updatedCategoryId) {
    changes.category = {
      from: existingExpense.categoryName,
      to: category.name,
    };
  }

  if (existingExpense.description !== updatedDescription) {
    changes.description = {
      from: existingExpense.description,
      to: updatedDescription,
    };
  }

  if (existingExpense.amount !== updatedAmount) {
    changes.amount = {
      from: existingExpense.amount,
      to: updatedAmount,
    };
  }

  if (existingExpense.expenseDate !== updatedExpenseDate) {
    changes.expenseDate = {
      from: existingExpense.expenseDate,
      to: updatedExpenseDate,
    };
  }

  if (existingExpense.notes !== updatedNotes) {
    changes.notes = {
      from: existingExpense.notes,
      to: updatedNotes,
    };
  }

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE expenses
      SET
        category_id = ?,
        description = ?,
        amount = ?,
        expense_date = ?,
        notes = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    updatedCategoryId,
    updatedDescription,
    updatedAmount,
    updatedExpenseDate,
    updatedNotes,
    updatedBy,
    now,
    id,
  );

  const expense = await getExpenseById(id);

  if (!expense) {
    throw new Error("Expense could not be found after update.");
  }

  if (Object.keys(changes).length > 0) {
    await doAction("expense.updated", {
      expense,
      changes,
    });
  }

  return expense;
}

export async function voidExpense(
  id: number,
  voidedBy: number,
  voidReason: string,
): Promise<Expense> {
  const db = await getDatabase();

  const reason = voidReason.trim();

  if (!reason) {
    throw new Error("A void reason is required.");
  }

  const existingExpense = await getExpenseById(id);

  if (!existingExpense) {
    throw new Error("Expense could not be found.");
  }

  if (existingExpense.isVoided) {
    throw new Error("This expense is already voided.");
  }

  const user = await db.getFirstAsync<{
    id: number;
    role: string;
    is_active: number;
  }>(
    `
      SELECT
        id,
        role,
        is_active
      FROM users
      WHERE id = ?;
    `,
    voidedBy,
  );

  if (!user) {
    throw new Error("User could not be found.");
  }

  if (user.is_active !== 1) {
    throw new Error("The user account is inactive.");
  }

  if (user.role !== "admin") {
    throw new Error("Only an administrator can void an expense.");
  }

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE expenses
      SET
        is_voided = 1,
        voided_by = ?,
        voided_at = ?,
        void_reason = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    voidedBy,
    now,
    reason,
    voidedBy,
    now,
    id,
  );

  const expense = await getExpenseById(id);

  if (!expense) {
    throw new Error("Expense could not be found after voiding.");
  }

  await doAction("expense.voided", {
    expense,
    changes: {
      isVoided: {
        from: false,
        to: true,
      },
      voidReason: {
        from: existingExpense.voidReason,
        to: reason,
      },
    },
  });

  return expense;
}
