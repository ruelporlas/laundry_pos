import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import type { Customer } from "@/models/customer";
import type { JobOrder, JobOrderItem } from "@/models/jobOrder";

import { styles } from "@/constants/jobOrderDetailsStyles";

type Props = {
  jobOrder: JobOrder;
  items: JobOrderItem[];
  customer: Customer | null;
  formatCurrency: (amount: number) => string;
  getStatusLabel: () => string;
  onPrint: () => void;
};

export function JobOrderClaimStubCard({
  jobOrder,
  items,
  customer,
  formatCurrency,
  getStatusLabel,
  onPrint,
}: Props) {
  return (
    <AppCard padding={spacing.lg} style={styles.stubCard}>
      <View style={styles.stubHeader}>
        <View style={styles.stubIcon}>
          <Ionicons name="ticket-outline" size={22} color={colors.primary} />
        </View>

        <View style={styles.stubHeaderText}>
          <Text style={styles.stubTitle}>Acknowledgment / Claim Stub</Text>

          <Text style={styles.stubSubtitle}>
            Give this to the customer for claiming
          </Text>
        </View>
      </View>

      <View style={styles.stubPreview}>
        <Text style={styles.stubShopTitle}>LAUNDRY SHOP</Text>

        <Text style={styles.stubDocumentTitle}>LAUNDRY ACKNOWLEDGMENT</Text>

        <View style={styles.stubDivider} />

        <View style={styles.stubRow}>
          <Text style={styles.stubLabel}>Job Order</Text>

          <Text style={styles.stubValue}>{jobOrder.jobOrderNumber}</Text>
        </View>

        <View style={styles.stubRow}>
          <Text style={styles.stubLabel}>Customer</Text>

          <Text style={styles.stubValue}>{customer?.name || "Customer"}</Text>
        </View>

        <View style={styles.stubDivider} />

        {items.map((item) => (
          <View key={item.id} style={styles.stubItem}>
            <View style={styles.stubItemMain}>
              <Text style={styles.stubItemName}>{item.itemName}</Text>

              <Text style={styles.stubItemQuantity}>
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </Text>
            </View>

            <Text style={styles.stubItemTotal}>
              {formatCurrency(item.lineTotal)}
            </Text>
          </View>
        ))}

        <View style={styles.stubDivider} />

        <View style={styles.stubTotalRow}>
          <Text style={styles.stubTotalLabel}>TOTAL</Text>

          <Text style={styles.stubTotalValue}>
            {formatCurrency(jobOrder.total)}
          </Text>
        </View>

        <View style={styles.stubStatus}>
          <Text style={styles.stubStatusLabel}>PAYMENT STATUS</Text>

          <Text
            style={[
              styles.stubStatusValue,
              jobOrder.isVoided && styles.stubStatusValueVoided,
            ]}
          >
            {getStatusLabel()}
          </Text>
        </View>

        <Text style={styles.stubFooter}>
          Please present this stub when claiming your laundry.
        </Text>
      </View>

      <AppButton
        title="Print Claim Stub"
        icon="print-outline"
        variant="secondary"
        fullWidth
        onPress={onPrint}
      />
    </AppCard>
  );
}
