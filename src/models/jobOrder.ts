export type JobOrderItemType = "product" | "service" | "bundle";

export type DiscountType = "percentage" | "fixed";

export type PaymentStatus = "paid" | "partially_paid" | "unpaid";

export type PaymentMethod = "cash" | "gcash" | "other";

export type JobOrder = {
  id: number;
  jobOrderNumber: string;

  customerId: number;

  subtotal: number;

  discountType: DiscountType | null;
  discountValue: number;
  discountAmount: number;

  total: number;

  amountPaid: number;
  balance: number;

  paymentStatus: PaymentStatus;

  isVoided: boolean;

  voidedBy: number | null;
  voidedAt: string | null;
  voidReason: string | null;

  notes: string;

  createdBy: number | null;
  createdAt: string;

  updatedBy: number | null;
  updatedAt: string;
};

export type JobOrderItem = {
  id: number;

  jobOrderId: number;

  itemType: JobOrderItemType;
  itemId: number;

  /**
   * Snapshot of the item name at the time
   * the Job Order was created.
   */
  itemName: string;

  /**
   * Snapshot of the selling price at the time
   * the Job Order was created.
   */
  unitPrice: number;

  quantity: number;

  lineTotal: number;

  createdAt: string;
};

export type Payment = {
  id: number;

  jobOrderId: number;

  paymentMethod: PaymentMethod;

  /**
   * Actual amount applied to the Job Order.
   */
  amount: number;

  /**
   * Cash physically received from the customer.
   * Used only for cash payments.
   */
  cashReceived: number | null;

  /**
   * Change given to the customer.
   * Used only for cash payments.
   */
  changeAmount: number | null;

  /**
   * GCash reference number.
   * Optional because the user may leave it blank.
   */
  referenceNumber: string | null;

  /**
   * Additional note describing an "Other"
   * payment method.
   *
   * Example:
   * - Maya
   * - Bank transfer
   * - Credit card
   * - QR payment
   */
  paymentNote: string | null;

  createdBy: number | null;
  createdAt: string;

  updatedBy: number | null;
  updatedAt: string | null;
};

/**
 * An item selected by the cashier before
 * the Job Order is saved to the database.
 */
export type JobOrderDraftItem = {
  itemType: JobOrderItemType;
  itemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
};

/**
 * Draft data used while creating a new Job Order.
 */
export type JobOrderDraft = {
  customerId: number | null;

  items: JobOrderDraftItem[];

  discountType: DiscountType | null;
  discountValue: number;

  notes: string;
};

/**
 * Payment information entered during
 * the payment step of the POS flow.
 */
export type PaymentInput = {
  paymentMethod: PaymentMethod;

  amount: number;

  cashReceived?: number;

  referenceNumber?: string;

  /**
   * Description of the payment method when
   * paymentMethod is "other".
   */
  paymentNote?: string;
};
