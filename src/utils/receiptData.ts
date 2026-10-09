import type { Customer } from "@/models/customer";
import type { JobOrder, JobOrderItem, Payment } from "@/models/jobOrder";
import type { ReceiptData, ReceiptItemType } from "@/models/receipt";
import type { AppSettings } from "@/models/settings";
import type { User } from "@/models/user";

type BuildReceiptDataInput = {
  jobOrder: JobOrder;
  items: JobOrderItem[];
  payments: Payment[];
  customer: Customer | null;
  createdByUser: User | null;
  settings: AppSettings;
};

function getPaymentMethodLabel(method: Payment["paymentMethod"]): string {
  switch (method) {
    case "cash":
      return "Cash";

    case "gcash":
      return "GCash";

    case "other":
      return "Other";

    default:
      return method;
  }
}

function getPaymentStatusLabel(status: JobOrder["paymentStatus"]): string {
  switch (status) {
    case "paid":
      return "Paid";

    case "partially_paid":
      return "Partially Paid";

    case "unpaid":
      return "Unpaid";

    default:
      return status;
  }
}

function getItemType(type: JobOrderItem["itemType"]): ReceiptItemType {
  return type;
}

export function buildReceiptData({
  jobOrder,
  items,
  payments,
  customer,
  createdByUser,
  settings,
}: BuildReceiptDataInput): ReceiptData {
  return {
    shop: {
      name: settings.shopName,
      address: settings.shopAddress,
      contact: settings.shopContact,
    },

    transaction: {
      jobOrderNumber: jobOrder.jobOrderNumber,
      date: jobOrder.createdAt,
      customerName: customer?.name || "Customer",
      staffName: createdByUser?.fullName || "Unknown User",
      status: jobOrder.isVoided
        ? "Voided"
        : getPaymentStatusLabel(jobOrder.paymentStatus),
    },

    items: items.map((item) => ({
      type: getItemType(item.itemType),
      name: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),

    totals: {
      subtotal: jobOrder.subtotal,
      discount: jobOrder.discountAmount,
      total: jobOrder.total,
    },

    payments: payments.map((payment) => ({
      method: getPaymentMethodLabel(payment.paymentMethod),
      amount: payment.amount,
      reference: payment.referenceNumber,
      cashReceived: payment.cashReceived,
      change: payment.changeAmount,
    })),

    balance: jobOrder.balance,

    footerMessage: settings.claimStubMessage,
  };
}
