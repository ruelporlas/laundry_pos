import type { Bundle } from "@/models/bundle";
import type { Customer } from "@/models/customer";
import type { Expense } from "@/models/expense";
import type { InventoryItem, InventoryMovement } from "@/models/inventory";
import type { JobOrderDraftItem } from "@/models/jobOrder";
import type { Product } from "@/models/product";
import type { Service } from "@/models/service";

export type AppActionMap = {
  "product.created": {
    product: Product;
  };

  "product.updated": {
    product: Product;
    changes: Record<
      string,
      {
        from: unknown;
        to: unknown;
      }
    >;
  };

  "product.activated": {
    product: Product;
  };

  "product.deactivated": {
    product: Product;
  };

  "service.created": {
    service: Service;
  };

  "service.updated": {
    service: Service;
    changes: Record<
      string,
      {
        from: unknown;
        to: unknown;
      }
    >;
  };

  "service.activated": {
    service: Service;
  };

  "service.deactivated": {
    service: Service;
  };

  "bundle.created": {
    bundle: Bundle;
  };

  "bundle.updated": {
    bundle: Bundle;
    changes: Record<
      string,
      {
        from: unknown;
        to: unknown;
      }
    >;
  };

  "bundle.activated": {
    bundle: Bundle;
  };

  "bundle.deactivated": {
    bundle: Bundle;
  };

  "customer.created": {
    customer: Customer;
  };

  "customer.updated": {
    customer: Customer;
    changes: Record<
      string,
      {
        from: unknown;
        to: unknown;
      }
    >;
  };

  "customer.activated": {
    customer: Customer;
  };

  "customer.deactivated": {
    customer: Customer;
  };

  "expense.created": {
    expense: Expense;
  };

  "expense.updated": {
    expense: Expense;
    changes: Record<
      string,
      {
        from: unknown;
        to: unknown;
      }
    >;
  };

  "expense.voided": {
    expense: Expense;
    changes: Record<
      string,
      {
        from: unknown;
        to: unknown;
      }
    >;
  };

  "job_order.item_removed": {
    jobOrderId: number;
    jobOrderNumber: string;
    removedItems: JobOrderDraftItem[];
  };

  "inventory.stock_received": {
    inventory: InventoryItem;
    movement: InventoryMovement;
    productName: string;
  };

  "inventory.stock_removed": {
    inventory: InventoryItem;
    movement: InventoryMovement;
    productName: string;
  };

  "inventory.stock_adjusted": {
    inventory: InventoryItem;
    movement: InventoryMovement;
    productName: string;
  };

  "inventory.stock_sold": {
    inventory: InventoryItem;
    movement: InventoryMovement;
    productName: string;
  };

  "inventory.stock_returned": {
    inventory: InventoryItem;
    movement: InventoryMovement;
    productName: string;
  };

  "inventory.enabled": {
    inventory: InventoryItem;
    productName: string;
  };

  "inventory.disabled": {
    inventory: InventoryItem;
    productName: string;
  };

  "inventory.updated": {
    inventory: InventoryItem;
    productName: string;
    changes: Record<
      string,
      {
        from: unknown;
        to: unknown;
      }
    >;
  };
};

export type AppActionName = keyof AppActionMap;

export type ActionHandler<T> = (payload: T) => void | Promise<void>;
