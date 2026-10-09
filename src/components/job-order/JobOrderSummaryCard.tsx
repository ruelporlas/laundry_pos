import { Text, View } from "react-native";

import { AppCard } from "@/components/ui/AppCard";
import { spacing } from "@/constants/spacing";
import type { Customer } from "@/models/customer";
import type { JobOrder } from "@/models/jobOrder";
import type { User } from "@/models/user";

import { styles } from "@/constants/jobOrderDetailsStyles";

type Props = {
  jobOrder: JobOrder;
  customer: Customer | null;
  createdByUser: User | null;
  formatCurrency: (amount: number) => string;
  getStatusLabel: () => string;
};

export function JobOrderSummaryCard({
  jobOrder,
  customer,
  createdByUser,
  formatCurrency,
  getStatusLabel,
}: Props) {
  return (
    <AppCard padding={spacing.lg} style={styles.summaryCard}>
      <View style={styles.summaryTopRow}>
        <Text style={styles.jobOrderLabel}>JOB ORDER</Text>

        <View
          style={[
            styles.statusBadge,
            jobOrder.isVoided && styles.statusBadgeVoided,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              jobOrder.isVoided
                ? styles.statusDotVoided
                : jobOrder.paymentStatus === "paid"
                  ? styles.statusDotPaid
                  : jobOrder.paymentStatus === "partially_paid"
                    ? styles.statusDotPartial
                    : styles.statusDotUnpaid,
            ]}
          />

          <Text
            style={[
              styles.statusText,
              jobOrder.isVoided
                ? styles.statusTextVoided
                : jobOrder.paymentStatus === "paid"
                  ? styles.statusTextPaid
                  : jobOrder.paymentStatus === "partially_paid"
                    ? styles.statusTextPartial
                    : styles.statusTextUnpaid,
            ]}
          >
            {getStatusLabel()}
          </Text>
        </View>
      </View>

      <Text style={styles.jobOrderNumber}>{jobOrder.jobOrderNumber}</Text>

      <View style={styles.customerCreatorRow}>
        <View style={styles.customerBlock}>
          <Text style={styles.customerLabel}>CUSTOMER</Text>

          <Text style={styles.customerName}>
            {customer?.name || "Customer"}
          </Text>
        </View>

        <View style={styles.creatorBlock}>
          <Text style={styles.customerLabel}>CREATED BY</Text>

          <Text style={styles.customerName}>
            {createdByUser?.fullName || "Unknown User"}
          </Text>
        </View>
      </View>

      <View style={styles.totalBlock}>
        <Text style={styles.totalLabel}>TOTAL</Text>

        <Text style={styles.totalValue}>{formatCurrency(jobOrder.total)}</Text>
      </View>

      <View style={styles.summaryDivider} />

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Amount Paid</Text>

        <Text style={styles.summaryValue}>
          {formatCurrency(jobOrder.amountPaid)}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Balance</Text>

        <Text
          style={[
            styles.summaryValue,
            jobOrder.balance > 0 && styles.balanceValue,
          ]}
        >
          {formatCurrency(jobOrder.balance)}
        </Text>
      </View>
    </AppCard>
  );
}
