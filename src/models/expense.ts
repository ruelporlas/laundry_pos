export type ExpenseCategory = {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateExpenseCategoryInput = {
  name: string;
  description?: string;
};

export type UpdateExpenseCategoryInput = {
  name: string;
  description?: string;
};

export type Expense = {
  id: number;
  categoryId: number;
  categoryName: string;
  description: string;
  amount: number;
  expenseDate: string;
  notes: string;
  createdBy: number | null;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string | null;
  isVoided: boolean;
  voidedBy: number | null;
  voidedAt: string | null;
  voidReason: string | null;
};

export type CreateExpenseInput = {
  categoryId: number;
  description?: string;
  amount: number;
  expenseDate: string;
  notes?: string;
};

export type UpdateExpenseInput = {
  categoryId: number;
  description?: string;
  amount: number;
  expenseDate: string;
  notes?: string;
};
