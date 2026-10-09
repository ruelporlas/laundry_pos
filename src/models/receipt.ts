export type ReceiptItemType = "product" | "service" | "bundle";

export type ReceiptItem = {
  type: ReceiptItemType;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ReceiptPayment = {
  method: string;
  amount: number;
  reference: string | null;
  cashReceived: number | null;
  change: number | null;
};

export type ReceiptData = {
  shop: {
    name: string;
    address: string;
    contact: string;
  };

  transaction: {
    jobOrderNumber: string;
    date: string;
    customerName: string;
    staffName: string;
    status: string;
  };

  items: ReceiptItem[];

  totals: {
    subtotal: number;
    discount: number;
    total: number;
  };

  payments: ReceiptPayment[];

  balance: number;

  footerMessage: string;
};
