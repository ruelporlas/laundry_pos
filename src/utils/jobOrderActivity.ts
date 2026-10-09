import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/constants/colors";
import type { AuditAction, AuditChange, AuditLog } from "@/models/auditLog";

export type RemovedItem = {
  itemName: string;
  itemType?: "product" | "service" | "bundle";
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ActivityConfig = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
};

export function getActivityConfig(action: AuditAction): ActivityConfig {
  switch (action) {
    case "created":
      return {
        label: "Created",
        icon: "add-circle-outline",
        color: colors.success,
        backgroundColor: colors.successLight,
      };

    case "updated":
      return {
        label: "Updated",
        icon: "create-outline",
        color: colors.primary,
        backgroundColor: colors.primaryLight,
      };

    case "activated":
      return {
        label: "Activated",
        icon: "checkmark-circle-outline",
        color: colors.success,
        backgroundColor: colors.successLight,
      };

    case "deactivated":
      return {
        label: "Deactivated",
        icon: "pause-circle-outline",
        color: colors.warning,
        backgroundColor: colors.warningLight,
      };

    case "voided":
      return {
        label: "Voided",
        icon: "close-circle-outline",
        color: colors.danger,
        backgroundColor: colors.dangerLight,
      };

    case "deleted":
      return {
        label: "Deleted",
        icon: "trash-outline",
        color: colors.danger,
        backgroundColor: colors.dangerLight,
      };

    case "item_removed":
      return {
        label: "Item Removed",
        icon: "trash-outline",
        color: colors.danger,
        backgroundColor: colors.dangerLight,
      };

    case "login":
      return {
        label: "Logged In",
        icon: "log-in-outline",
        color: colors.success,
        backgroundColor: colors.successLight,
      };

    case "logout":
      return {
        label: "Logged Out",
        icon: "log-out-outline",
        color: colors.textSecondary,
        backgroundColor: colors.surfaceSoft,
      };

    case "password_changed":
      return {
        label: "Password Changed",
        icon: "key-outline",
        color: colors.primary,
        backgroundColor: colors.primaryLight,
      };

    case "password_reset":
      return {
        label: "Password Reset",
        icon: "key-outline",
        color: colors.warning,
        backgroundColor: colors.warningLight,
      };

    case "payment_added":
      return {
        label: "Payment Added",
        icon: "card-outline",
        color: colors.success,
        backgroundColor: colors.successLight,
      };

    case "other":
    default:
      return {
        label: "Activity",
        icon: "information-circle-outline",
        color: colors.textSecondary,
        backgroundColor: colors.surfaceSoft,
      };
  }
}

export function getActivitySummary(
  activity: AuditLog,
  formatCurrency: (amount: number) => string,
): string {
  if (activity.action === "item_removed") {
    const removedItems = getRemovedItems(activity);

    if (removedItems.length === 1) {
      return "1 item removed";
    }

    if (removedItems.length > 1) {
      return `${removedItems.length} items removed`;
    }

    return "Items were removed";
  }

  if (activity.action === "payment_added") {
    const amount = getPaymentAmount(activity);

    if (amount !== null) {
      return `Payment recorded: ${formatCurrency(amount)}`;
    }

    return "A payment was recorded";
  }

  if (activity.action === "voided") {
    return "Transaction was voided";
  }

  if (activity.action === "created") {
    return "Job Order created";
  }

  if (activity.action === "updated") {
    return "Job Order updated";
  }

  return "Activity recorded";
}

export function getPaymentAmount(activity: AuditLog): number | null {
  const changes = activity.changes;

  const possibleValues = [
    changes.amount,
    changes.paymentAmount,
    changes.paidAmount,
  ];

  for (const value of possibleValues) {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export function getRemovedItems(activity: AuditLog): RemovedItem[] {
  const changes = activity.changes;

  const removedItems = changes.removedItems;

  if (Array.isArray(removedItems)) {
    return removedItems.map((item) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};

      const quantity =
        typeof record.quantity === "number" ? record.quantity : 0;

      const unitPrice =
        typeof record.unitPrice === "number" ? record.unitPrice : 0;

      const lineTotal =
        typeof record.lineTotal === "number"
          ? record.lineTotal
          : quantity * unitPrice;

      return {
        itemName:
          typeof record.itemName === "string"
            ? record.itemName
            : typeof record.name === "string"
              ? record.name
              : "Item",
        itemType:
          record.itemType === "service" ||
          record.itemType === "bundle" ||
          record.itemType === "product"
            ? record.itemType
            : undefined,
        quantity,
        unitPrice,
        lineTotal,
      };
    });
  }

  const itemsChange = changes.items;

  if (!itemsChange || typeof itemsChange !== "object") {
    return [];
  }

  const fromValue = (itemsChange as AuditChange).from;

  if (typeof fromValue !== "string" || !fromValue.trim()) {
    return [];
  }

  return fromValue
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(
        /^(.*?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*@\s*₱?\s*([\d,]+(?:\.\d+)?)$/,
      );

      if (!match) {
        return {
          itemName: line,
          itemType: undefined,
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
        };
      }

      const [, itemName, quantityText, unitPriceText] = match;

      const quantity = Number(quantityText);
      const unitPrice = Number(unitPriceText.replace(/,/g, ""));

      return {
        itemName: itemName.trim(),
        itemType: undefined,
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice,
      };
    });
}

export function formatActivityChangeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "string") {
    return value;
  }

  return "Details changed";
}

export function formatFieldName(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}
