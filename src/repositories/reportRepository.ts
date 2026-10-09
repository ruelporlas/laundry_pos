import { getDatabase } from "@/database";
import type { PaymentMethod } from "@/models/jobOrder";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type SalesReportDateRange = {
  startDate: string;
  endDate: string;
};

export type SalesReportSummary = {
  grossSales: number;
  discounts: number;
  netSales: number;

  collected: number;
  outstanding: number;

  jobOrderCount: number;

  totalExpenses: number;
};

export type SalesBreakdown = {
  services: number;
  products: number;
  bundles: number;
};

export type PaymentCollectionBreakdown = {
  cash: number;
  gcash: number;
  other: number;
};

export type ExpenseBreakdown = {
  categoryId: number;
  categoryName: string;
  total: number;
};

export type ReportExpense = {
  id: number;
  categoryId: number;
  categoryName: string;
  description: string;
  amount: number;
  expenseDate: string;
};

export type DailyReportBreakdown = {
  date: string;
  grossSales: number;
  expenses: number;
  net: number;
};

/* -------------------------------------------------------------------------- */
/* Final Report                                                               */
/* -------------------------------------------------------------------------- */

export type SalesReport = {
  dateRange: SalesReportDateRange;

  summary: SalesReportSummary;

  salesBreakdown: SalesBreakdown;

  paymentCollections: PaymentCollectionBreakdown;

  expenseBreakdown: ExpenseBreakdown[];

  expenses: ReportExpense[];

  dailyBreakdown: DailyReportBreakdown[];
};

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function validateDateRange(dateRange: SalesReportDateRange): void {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(dateRange.startDate)) {
    throw new Error("Invalid report start date.");
  }

  if (!datePattern.test(dateRange.endDate)) {
    throw new Error("Invalid report end date.");
  }

  if (dateRange.startDate > dateRange.endDate) {
    throw new Error("Report start date cannot be after the end date.");
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const PHILIPPINE_DATE_SQL = "date(created_at, '+8 hours')";

const PHILIPPINE_PAYMENT_DATE_SQL = "date(p.created_at, '+8 hours')";

/* -------------------------------------------------------------------------- */
/* Sales Report                                                               */
/* -------------------------------------------------------------------------- */

export async function getSalesReport(
  dateRange: SalesReportDateRange,
): Promise<SalesReport> {
  validateDateRange(dateRange);

  const db = await getDatabase();

  /* ------------------------------------------------------------------------ */
  /* Sales summary                                                            */
  /* ------------------------------------------------------------------------ */

  const summaryRow = await db.getFirstAsync<{
    gross_sales: number | null;
    discounts: number | null;
    net_sales: number | null;
    outstanding: number | null;
    job_order_count: number | null;
  }>(
    `
      SELECT
        COALESCE(SUM(subtotal), 0) AS gross_sales,
        COALESCE(SUM(discount_amount), 0) AS discounts,
        COALESCE(SUM(total), 0) AS net_sales,
        COALESCE(SUM(balance), 0) AS outstanding,
        COUNT(*) AS job_order_count
      FROM job_orders
      WHERE
        is_voided = 0
        AND ${PHILIPPINE_DATE_SQL} BETWEEN ? AND ?;
    `,
    dateRange.startDate,
    dateRange.endDate,
  );

  /* ------------------------------------------------------------------------ */
  /* Sales breakdown                                                          */
  /* ------------------------------------------------------------------------ */

  const salesBreakdownRows = await db.getAllAsync<{
    item_type: "product" | "service" | "bundle";
    total: number | null;
  }>(
    `
      SELECT
        joi.item_type,
        COALESCE(SUM(joi.line_total), 0) AS total
      FROM job_order_items joi
      INNER JOIN job_orders jo
        ON jo.id = joi.job_order_id
      WHERE
        jo.is_voided = 0
        AND ${PHILIPPINE_DATE_SQL.replace(
          "created_at",
          "jo.created_at",
        )} BETWEEN ? AND ?
      GROUP BY joi.item_type;
    `,
    dateRange.startDate,
    dateRange.endDate,
  );

  const salesBreakdown: SalesBreakdown = {
    services: 0,
    products: 0,
    bundles: 0,
  };

  for (const row of salesBreakdownRows) {
    if (row.item_type === "service") {
      salesBreakdown.services = row.total ?? 0;
    }

    if (row.item_type === "product") {
      salesBreakdown.products = row.total ?? 0;
    }

    if (row.item_type === "bundle") {
      salesBreakdown.bundles = row.total ?? 0;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Payment collections                                                      */
  /* ------------------------------------------------------------------------ */

  const paymentRows = await db.getAllAsync<{
    payment_method: PaymentMethod;
    total: number | null;
  }>(
    `
      SELECT
        p.payment_method,
        COALESCE(SUM(p.amount), 0) AS total
      FROM payments p
      INNER JOIN job_orders jo
        ON jo.id = p.job_order_id
      WHERE
        jo.is_voided = 0
        AND ${PHILIPPINE_PAYMENT_DATE_SQL} BETWEEN ? AND ?
      GROUP BY p.payment_method;
    `,
    dateRange.startDate,
    dateRange.endDate,
  );

  const paymentCollections: PaymentCollectionBreakdown = {
    cash: 0,
    gcash: 0,
    other: 0,
  };

  for (const row of paymentRows) {
    if (row.payment_method === "cash") {
      paymentCollections.cash = row.total ?? 0;
    }

    if (row.payment_method === "gcash") {
      paymentCollections.gcash = row.total ?? 0;
    }

    if (row.payment_method === "other") {
      paymentCollections.other = row.total ?? 0;
    }
  }

  const collected =
    paymentCollections.cash +
    paymentCollections.gcash +
    paymentCollections.other;

  /* ------------------------------------------------------------------------ */
  /* Expense summary                                                          */
  /* ------------------------------------------------------------------------ */

  const expenseSummaryRow = await db.getFirstAsync<{
    total_expenses: number | null;
  }>(
    `
      SELECT
        COALESCE(SUM(amount), 0) AS total_expenses
      FROM expenses
      WHERE
        is_voided = 0
        AND expense_date BETWEEN ? AND ?;
    `,
    dateRange.startDate,
    dateRange.endDate,
  );

  const totalExpenses = expenseSummaryRow?.total_expenses ?? 0;

  /* ------------------------------------------------------------------------ */
  /* Expense breakdown                                                        */
  /* ------------------------------------------------------------------------ */

  const expenseBreakdownRows = await db.getAllAsync<{
    category_id: number;
    category_name: string;
    total: number | null;
  }>(
    `
      SELECT
        e.category_id,
        ec.name AS category_name,
        COALESCE(SUM(e.amount), 0) AS total
      FROM expenses e
      INNER JOIN expense_categories ec
        ON ec.id = e.category_id
      WHERE
        e.is_voided = 0
        AND e.expense_date BETWEEN ? AND ?
      GROUP BY
        e.category_id,
        ec.name
      ORDER BY total DESC, ec.name ASC;
    `,
    dateRange.startDate,
    dateRange.endDate,
  );

  const expenseBreakdown: ExpenseBreakdown[] = expenseBreakdownRows.map(
    (row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      total: row.total ?? 0,
    }),
  );

  /* ------------------------------------------------------------------------ */
  /* Individual expenses                                                      */
  /* ------------------------------------------------------------------------ */

  const expenseRows = await db.getAllAsync<{
    id: number;
    category_id: number;
    category_name: string;
    description: string | null;
    amount: number | null;
    expense_date: string;
  }>(
    `
      SELECT
        e.id,
        e.category_id,
        ec.name AS category_name,
        e.description,
        e.amount,
        e.expense_date
      FROM expenses e
      INNER JOIN expense_categories ec
        ON ec.id = e.category_id
      WHERE
        e.is_voided = 0
        AND e.expense_date BETWEEN ? AND ?
      ORDER BY
        e.expense_date DESC,
        e.id DESC;
    `,
    dateRange.startDate,
    dateRange.endDate,
  );

  const expenses: ReportExpense[] = expenseRows.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    description: row.description ?? "",
    amount: row.amount ?? 0,
    expenseDate: row.expense_date,
  }));

  /* ------------------------------------------------------------------------ */
  /* Daily sales breakdown                                                    */
  /* ------------------------------------------------------------------------ */

  const dailySalesRows = await db.getAllAsync<{
    report_date: string;
    gross_sales: number | null;
  }>(
    `
      SELECT
        ${PHILIPPINE_DATE_SQL} AS report_date,
        COALESCE(SUM(subtotal), 0) AS gross_sales
      FROM job_orders
      WHERE
        is_voided = 0
        AND ${PHILIPPINE_DATE_SQL} BETWEEN ? AND ?
      GROUP BY ${PHILIPPINE_DATE_SQL}
      ORDER BY report_date ASC;
    `,
    dateRange.startDate,
    dateRange.endDate,
  );

  /* ------------------------------------------------------------------------ */
  /* Daily expense breakdown                                                  */
  /* ------------------------------------------------------------------------ */

  const dailyExpenseRows = await db.getAllAsync<{
    report_date: string;
    expenses: number | null;
  }>(
    `
      SELECT
        expense_date AS report_date,
        COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE
        is_voided = 0
        AND expense_date BETWEEN ? AND ?
      GROUP BY expense_date
      ORDER BY report_date ASC;
    `,
    dateRange.startDate,
    dateRange.endDate,
  );

  /* ------------------------------------------------------------------------ */
  /* Merge daily sales + expenses                                             */
  /* ------------------------------------------------------------------------ */

  const dailyMap = new Map<
    string,
    {
      grossSales: number;
      expenses: number;
    }
  >();

  for (const row of dailySalesRows) {
    dailyMap.set(row.report_date, {
      grossSales: row.gross_sales ?? 0,
      expenses: 0,
    });
  }

  for (const row of dailyExpenseRows) {
    const existing = dailyMap.get(row.report_date);

    if (existing) {
      existing.expenses = row.expenses ?? 0;
    } else {
      dailyMap.set(row.report_date, {
        grossSales: 0,
        expenses: row.expenses ?? 0,
      });
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Include every day in selected date range                                 */
  /* ------------------------------------------------------------------------ */

  const dailyBreakdown: DailyReportBreakdown[] = [];

  const currentDate = new Date(`${dateRange.startDate}T00:00:00`);
  const endDate = new Date(`${dateRange.endDate}T00:00:00`);

  while (currentDate <= endDate) {
    const date = [
      currentDate.getFullYear(),
      String(currentDate.getMonth() + 1).padStart(2, "0"),
      String(currentDate.getDate()).padStart(2, "0"),
    ].join("-");

    const values = dailyMap.get(date) ?? {
      grossSales: 0,
      expenses: 0,
    };

    dailyBreakdown.push({
      date,
      grossSales: values.grossSales,
      expenses: values.expenses,
      net: values.grossSales - values.expenses,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  /* ------------------------------------------------------------------------ */
  /* Final report                                                             */
  /* ------------------------------------------------------------------------ */

  return {
    dateRange,

    summary: {
      grossSales: summaryRow?.gross_sales ?? 0,
      discounts: summaryRow?.discounts ?? 0,
      netSales: summaryRow?.net_sales ?? 0,
      collected,
      outstanding: summaryRow?.outstanding ?? 0,
      jobOrderCount: summaryRow?.job_order_count ?? 0,
      totalExpenses,
    },

    salesBreakdown,

    paymentCollections,

    expenseBreakdown,

    expenses,

    dailyBreakdown,
  };
}
