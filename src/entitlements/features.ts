export const FEATURES = {
  CORE_POS: "core_pos",
  EXPENSE_MANAGEMENT: "expense_management",
  AUDIT_LOG: "audit_log",
  ADVANCED_REPORTS: "advanced_reports",
  PAYROLL: "payroll",
  EMPLOYEE_TIME_TRACKING: "employee_time_tracking",
  INVENTORY: "inventory",
  CLOUD_SYNC: "cloud_sync",
  BLUETOOTH_PRINTING: "bluetooth_printing",
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];
