import { getDatabase } from "@/database";
import type {
    AppSettings,
    ReceiptPaperWidth,
    UpdateAppSettingsInput,
} from "@/models/settings";

const DEFAULT_CLAIM_STUB_MESSAGE =
  "PLEASE DO NOT LOSE THIS TICKET. PRESENT THIS CLAIM STUB WHEN CLAIMING YOUR LAUNDRY.";

type SettingsRow = {
  id: number;
  shop_name: string;
  shop_address: string;
  shop_contact: string;
  claim_stub_message: string;
  receipt_paper_width: ReceiptPaperWidth;
  created_at: string;
  updated_at: string;
};

function mapSettings(row: SettingsRow): AppSettings {
  return {
    id: 1,
    shopName: row.shop_name,
    shopAddress: row.shop_address,
    shopContact: row.shop_contact,
    claimStubMessage: row.claim_stub_message,
    receiptPaperWidth: row.receipt_paper_width,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();

  let row = await db.getFirstAsync<SettingsRow>(
    `
      SELECT
        id,
        shop_name,
        shop_address,
        shop_contact,
        claim_stub_message,
        receipt_paper_width,
        created_at,
        updated_at
      FROM app_settings
      WHERE id = 1
      LIMIT 1;
    `,
  );

  if (!row) {
    const now = new Date().toISOString();

    await db.runAsync(
      `
        INSERT INTO app_settings (
          id,
          shop_name,
          shop_address,
          shop_contact,
          claim_stub_message,
          receipt_paper_width,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      1,
      "",
      "",
      "",
      DEFAULT_CLAIM_STUB_MESSAGE,
      "58mm",
      now,
      now,
    );

    row = await db.getFirstAsync<SettingsRow>(
      `
        SELECT
          id,
          shop_name,
          shop_address,
          shop_contact,
          claim_stub_message,
          receipt_paper_width,
          created_at,
          updated_at
        FROM app_settings
        WHERE id = 1
        LIMIT 1;
      `,
    );
  }

  if (!row) {
    throw new Error("Unable to load application settings.");
  }

  return mapSettings(row);
}

export async function updateAppSettings(
  input: UpdateAppSettingsInput,
): Promise<AppSettings> {
  const db = await getDatabase();

  const shopName = input.shopName.trim();
  const shopAddress = input.shopAddress.trim();
  const shopContact = input.shopContact.trim();
  const claimStubMessage = input.claimStubMessage.trim();

  if (!shopName) {
    throw new Error("Shop name is required.");
  }

  if (!claimStubMessage) {
    throw new Error("Claim stub message is required.");
  }

  const validPaperWidths: ReceiptPaperWidth[] = ["58mm", "80mm"];

  if (!validPaperWidths.includes(input.receiptPaperWidth)) {
    throw new Error("Invalid receipt paper width.");
  }

  const now = new Date().toISOString();

  await db.runAsync(
    `
      UPDATE app_settings
      SET
        shop_name = ?,
        shop_address = ?,
        shop_contact = ?,
        claim_stub_message = ?,
        receipt_paper_width = ?,
        updated_at = ?
      WHERE id = 1;
    `,
    shopName,
    shopAddress,
    shopContact,
    claimStubMessage,
    input.receiptPaperWidth,
    now,
  );

  return getAppSettings();
}
