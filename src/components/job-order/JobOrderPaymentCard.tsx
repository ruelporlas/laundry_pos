import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import type { JobOrder, Payment, PaymentMethod } from "@/models/jobOrder";

import { styles } from "@/constants/jobOrderDetailsStyles";

type Props = {
  jobOrder: JobOrder;
  payments: Payment[];
  formatCurrency: (amount: number) => string;
  getPaymentMethodLabel: (method: PaymentMethod) => string;
  onMakePayment: () => void;
};

export function JobOrderPaymentCard({
  jobOrder,
  payments,
  formatCurrency,
  getPaymentMethodLabel,
  onMakePayment,
}: Props) {
  return (
    <AppCard padding={spacing.lg}>
      <SectionHeader
        icon="card-outline"
        title="Payment History"
        subtitle="Payments recorded for this Job Order"
      />

      {payments.length === 0 ? (
        <View style={styles.emptyPayments}>
          <Ionicons name="wallet-outline" size={28} color={colors.textMuted} />

          <Text style={styles.emptyPaymentsText}>
            No payments have been recorded yet.
          </Text>
        </View>
      ) : (
        <View style={styles.paymentList}>
          {payments.map((payment, index) => (
            <View
              key={payment.id}
              style={[
                styles.paymentRow,
                index < payments.length - 1 && styles.paymentRowDivider,
              ]}
            >
              <View style={styles.paymentIcon}>
                <Ionicons
                  name={
                    payment.paymentMethod === "cash"
                      ? "cash-outline"
                      : payment.paymentMethod === "gcash"
                        ? "phone-portrait-outline"
                        : "card-outline"
                  }
                  size={19}
                  color={colors.primary}
                />
              </View>

              <View style={styles.paymentMain}>
                <Text style={styles.paymentMethod}>
                  {getPaymentMethodLabel(payment.paymentMethod)}
                </Text>

                {payment.referenceNumber && (
                  <Text style={styles.paymentMeta}>
                    Ref: {payment.referenceNumber}
                  </Text>
                )}

                {payment.paymentNote && (
                  <Text style={styles.paymentMeta}>{payment.paymentNote}</Text>
                )}
              </View>

              <Text style={styles.paymentAmount}>
                {formatCurrency(payment.amount)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {jobOrder.balance > 0 && !jobOrder.isVoided && (
        <View style={styles.paymentAction}>
          <AppButton
            title={
              jobOrder.paymentStatus === "unpaid"
                ? "Make Payment"
                : "Pay Remaining Balance"
            }
            icon="card-outline"
            fullWidth
            onPress={onMakePayment}
          />
        </View>
      )}
    </AppCard>
  );
}
