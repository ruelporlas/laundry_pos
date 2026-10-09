import type { ReceiptData } from "@/models/receipt";
import { getCustomerById } from "@/repositories/customerRepository";
import {
    getJobOrderById,
    getJobOrderItems,
    getJobOrderPayments,
} from "@/repositories/jobOrderRepository";
import { getAppSettings } from "@/repositories/settingsRepository";
import { getUserById } from "@/repositories/userRepository";
import { buildReceiptData } from "@/utils/receiptData";

export async function getReceiptData(jobOrderId: number): Promise<ReceiptData> {
  const jobOrder = await getJobOrderById(jobOrderId);

  if (!jobOrder) {
    throw new Error("Job Order could not be found.");
  }

  const [items, payments, customer, createdByUser, settings] =
    await Promise.all([
      getJobOrderItems(jobOrderId),
      getJobOrderPayments(jobOrderId),
      getCustomerById(jobOrder.customerId),
      jobOrder.createdBy !== null
        ? getUserById(jobOrder.createdBy)
        : Promise.resolve(null),
      getAppSettings(),
    ]);

  return buildReceiptData({
    jobOrder,
    items,
    payments,
    customer,
    createdByUser,
    settings,
  });
}
