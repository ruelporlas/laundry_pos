export type ReceiptPaperWidth = "58mm" | "80mm";

export type AppSettings = {
  id: 1;

  shopName: string;
  shopAddress: string;
  shopContact: string;

  claimStubMessage: string;

  receiptPaperWidth: ReceiptPaperWidth;

  createdAt: string;
  updatedAt: string;
};

export type UpdateAppSettingsInput = {
  shopName: string;
  shopAddress: string;
  shopContact: string;
  claimStubMessage: string;
  receiptPaperWidth: ReceiptPaperWidth;
};
