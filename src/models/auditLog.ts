export type AuditAction =
  | "created"
  | "updated"
  | "voided"
  | "deleted"
  | "activated"
  | "deactivated"
  | "login"
  | "logout"
  | "password_changed"
  | "password_reset"
  | "payment_added"
  | "item_removed"
  | "stock_received"
  | "stock_removed"
  | "stock_adjusted"
  | "stock_sold"
  | "stock_returned"
  | "inventory_enabled"
  | "inventory_disabled"
  | "inventory_updated"
  | "other";

export type AuditEntityType =
  | "user"
  | "customer"
  | "product"
  | "service"
  | "bundle"
  | "job_order"
  | "payment"
  | "expense"
  | "expense_category"
  | "inventory"
  | "settings"
  | "other";

export type AuditChange = {
  from: unknown;
  to: unknown;
};

export type AuditChanges = Record<string, AuditChange>;

export type AuditLog = {
  id: number;
  userId: number | null;
  userName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: number | null;
  entityName: string;
  changes: AuditChanges;
  createdAt: string;
};

export type CreateAuditLogInput = {
  userId?: number | null;
  userName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: number | null;
  entityName?: string;
  changes?: AuditChanges;
};
