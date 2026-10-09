import { getCurrentUser } from "@/context/authSession";
import { addAction } from "@/hooks/actions";
import { createAuditLog } from "@/repositories/auditLogRepository";

import type { AppActionMap } from "./actionTypes";

let registered = false;

export function registerAuditActions(): void {
  if (registered) {
    return;
  }

  registered = true;

  addAction(
    "product.created",
    async (payload: AppActionMap["product.created"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "created",
        entityType: "product",
        entityId: payload.product.id,
        entityName: payload.product.name,
      });
    },
  );

  addAction(
    "product.updated",
    async (payload: AppActionMap["product.updated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "updated",
        entityType: "product",
        entityId: payload.product.id,
        entityName: payload.product.name,
        changes: payload.changes,
      });
    },
  );

  addAction(
    "product.activated",
    async (payload: AppActionMap["product.activated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "activated",
        entityType: "product",
        entityId: payload.product.id,
        entityName: payload.product.name,
      });
    },
  );

  addAction(
    "product.deactivated",
    async (payload: AppActionMap["product.deactivated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "deactivated",
        entityType: "product",
        entityId: payload.product.id,
        entityName: payload.product.name,
      });
    },
  );

  addAction(
    "service.created",
    async (payload: AppActionMap["service.created"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "created",
        entityType: "service",
        entityId: payload.service.id,
        entityName: payload.service.name,
      });
    },
  );

  addAction(
    "service.updated",
    async (payload: AppActionMap["service.updated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "updated",
        entityType: "service",
        entityId: payload.service.id,
        entityName: payload.service.name,
        changes: payload.changes,
      });
    },
  );

  addAction(
    "service.activated",
    async (payload: AppActionMap["service.activated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "activated",
        entityType: "service",
        entityId: payload.service.id,
        entityName: payload.service.name,
      });
    },
  );

  addAction(
    "service.deactivated",
    async (payload: AppActionMap["service.deactivated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "deactivated",
        entityType: "service",
        entityId: payload.service.id,
        entityName: payload.service.name,
      });
    },
  );

  addAction(
    "bundle.created",
    async (payload: AppActionMap["bundle.created"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "created",
        entityType: "bundle",
        entityId: payload.bundle.id,
        entityName: payload.bundle.name,
      });
    },
  );

  addAction(
    "bundle.updated",
    async (payload: AppActionMap["bundle.updated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "updated",
        entityType: "bundle",
        entityId: payload.bundle.id,
        entityName: payload.bundle.name,
        changes: payload.changes,
      });
    },
  );

  addAction(
    "bundle.activated",
    async (payload: AppActionMap["bundle.activated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "activated",
        entityType: "bundle",
        entityId: payload.bundle.id,
        entityName: payload.bundle.name,
      });
    },
  );

  addAction(
    "bundle.deactivated",
    async (payload: AppActionMap["bundle.deactivated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "deactivated",
        entityType: "bundle",
        entityId: payload.bundle.id,
        entityName: payload.bundle.name,
      });
    },
  );

  addAction(
    "customer.created",
    async (payload: AppActionMap["customer.created"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "created",
        entityType: "customer",
        entityId: payload.customer.id,
        entityName: payload.customer.name,
      });
    },
  );

  addAction(
    "customer.updated",
    async (payload: AppActionMap["customer.updated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "updated",
        entityType: "customer",
        entityId: payload.customer.id,
        entityName: payload.customer.name,
        changes: payload.changes,
      });
    },
  );

  addAction(
    "customer.activated",
    async (payload: AppActionMap["customer.activated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "activated",
        entityType: "customer",
        entityId: payload.customer.id,
        entityName: payload.customer.name,
      });
    },
  );

  addAction(
    "customer.deactivated",
    async (payload: AppActionMap["customer.deactivated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "deactivated",
        entityType: "customer",
        entityId: payload.customer.id,
        entityName: payload.customer.name,
      });
    },
  );

  addAction(
    "expense.created",
    async (payload: AppActionMap["expense.created"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "created",
        entityType: "expense",
        entityId: payload.expense.id,
        entityName: payload.expense.description || payload.expense.categoryName,
      });
    },
  );

  addAction(
    "expense.updated",
    async (payload: AppActionMap["expense.updated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "updated",
        entityType: "expense",
        entityId: payload.expense.id,
        entityName: payload.expense.description || payload.expense.categoryName,
        changes: payload.changes,
      });
    },
  );

  addAction(
    "expense.voided",
    async (payload: AppActionMap["expense.voided"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "voided",
        entityType: "expense",
        entityId: payload.expense.id,
        entityName: payload.expense.description || payload.expense.categoryName,
        changes: payload.changes,
      });
    },
  );

  addAction(
    "job_order.item_removed",
    async (payload: AppActionMap["job_order.item_removed"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      const removedItemsText = payload.removedItems
        .map(
          (item) =>
            `${item.itemName} × ${item.quantity} @ ₱${item.unitPrice.toFixed(2)}`,
        )
        .join("\n");

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "item_removed",
        entityType: "job_order",
        entityId: payload.jobOrderId,
        entityName: payload.jobOrderNumber,
        changes: {
          items: {
            from: removedItemsText,
            to: "Removed from Job Order",
          },
        },
      });
    },
  );

  addAction(
    "inventory.stock_received",
    async (payload: AppActionMap["inventory.stock_received"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "stock_received",
        entityType: "inventory",
        entityId: payload.inventory.id,
        entityName: payload.productName,
        changes: {
          quantity: {
            from: 0,
            to: payload.movement.quantity,
          },
          balance: {
            from: payload.movement.balanceAfter - payload.movement.quantity,
            to: payload.movement.balanceAfter,
          },
          unitCost: {
            from: 0,
            to: payload.movement.unitCost,
          },
          supplier: {
            from: "",
            to: payload.movement.supplier,
          },
          reference: {
            from: "",
            to: payload.movement.reference,
          },
          notes: {
            from: "",
            to: payload.movement.notes,
          },
        },
      });
    },
  );

  addAction(
    "inventory.stock_removed",
    async (payload: AppActionMap["inventory.stock_removed"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "stock_removed",
        entityType: "inventory",
        entityId: payload.inventory.id,
        entityName: payload.productName,
        changes: {
          quantity: {
            from: 0,
            to: payload.movement.quantity,
          },
          balance: {
            from: payload.movement.balanceAfter - payload.movement.quantity,
            to: payload.movement.balanceAfter,
          },
          reason: {
            from: "",
            to: payload.movement.reason,
          },
          reference: {
            from: "",
            to: payload.movement.reference,
          },
          notes: {
            from: "",
            to: payload.movement.notes,
          },
        },
      });
    },
  );

  addAction(
    "inventory.stock_adjusted",
    async (payload: AppActionMap["inventory.stock_adjusted"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "stock_adjusted",
        entityType: "inventory",
        entityId: payload.inventory.id,
        entityName: payload.productName,
        changes: {
          quantity: {
            from: payload.movement.balanceAfter - payload.movement.quantity,
            to: payload.movement.balanceAfter,
          },
          difference: {
            from: 0,
            to: payload.movement.quantity,
          },
          reason: {
            from: "",
            to: payload.movement.reason,
          },
          notes: {
            from: "",
            to: payload.movement.notes,
          },
        },
      });
    },
  );

  addAction(
    "inventory.stock_sold",
    async (payload: AppActionMap["inventory.stock_sold"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "stock_sold",
        entityType: "inventory",
        entityId: payload.inventory.id,
        entityName: payload.productName,
        changes: {
          quantity: {
            from: 0,
            to: payload.movement.quantity,
          },
          balance: {
            from: payload.movement.balanceAfter - payload.movement.quantity,
            to: payload.movement.balanceAfter,
          },
          reference: {
            from: "",
            to: payload.movement.reference,
          },
        },
      });
    },
  );

  addAction(
    "inventory.stock_returned",
    async (payload: AppActionMap["inventory.stock_returned"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "stock_returned",
        entityType: "inventory",
        entityId: payload.inventory.id,
        entityName: payload.productName,
        changes: {
          quantity: {
            from: 0,
            to: payload.movement.quantity,
          },
          balance: {
            from: payload.movement.balanceAfter - payload.movement.quantity,
            to: payload.movement.balanceAfter,
          },
          reference: {
            from: "",
            to: payload.movement.reference,
          },
          reason: {
            from: "",
            to: payload.movement.reason,
          },
        },
      });
    },
  );

  addAction(
    "inventory.enabled",
    async (payload: AppActionMap["inventory.enabled"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "inventory_enabled",
        entityType: "inventory",
        entityId: payload.inventory.id,
        entityName: payload.productName,
      });
    },
  );

  addAction(
    "inventory.disabled",
    async (payload: AppActionMap["inventory.disabled"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "inventory_disabled",
        entityType: "inventory",
        entityId: payload.inventory.id,
        entityName: payload.productName,
      });
    },
  );

  addAction(
    "inventory.updated",
    async (payload: AppActionMap["inventory.updated"]) => {
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      await createAuditLog({
        userId: user.id,
        userName: user.fullName,
        action: "inventory_updated",
        entityType: "inventory",
        entityId: payload.inventory.id,
        entityName: payload.productName,
        changes: payload.changes,
      });
    },
  );
}
