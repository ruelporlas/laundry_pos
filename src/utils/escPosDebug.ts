import type { ReceiptPaperWidth } from "@/models/settings";
import { getReceiptData } from "@/services/receiptService";
import { formatReceiptToEscPos } from "@/utils/escPosFormatter";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}

export async function getEscPosHexForJobOrder(
  jobOrderId: number,
  paperWidth: ReceiptPaperWidth = "58mm",
): Promise<string> {
  const receiptData = await getReceiptData(jobOrderId);

  const bytes = formatReceiptToEscPos(receiptData, paperWidth);

  return bytesToHex(bytes);
}
