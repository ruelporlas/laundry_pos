import { Text, View } from "react-native";

import { AppCard } from "@/components/ui/AppCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { spacing } from "@/constants/spacing";
import type { JobOrder, JobOrderItem } from "@/models/jobOrder";

import { styles } from "@/constants/jobOrderDetailsStyles";

type Props = {
  jobOrder: JobOrder;
  items: JobOrderItem[];
  formatCurrency: (amount: number) => string;
};

export function JobOrderItemsCard({ jobOrder, items, formatCurrency }: Props) {
  return (
    <AppCard padding={spacing.lg}>
      <SectionHeader
        icon="basket-outline"
        title="Order Items"
        subtitle="Items included in this Job Order"
      />

      <View style={styles.itemList}>
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.orderItem,
              index < items.length - 1 && styles.orderItemDivider,
            ]}
          >
            <View style={styles.orderItemMain}>
              <Text style={styles.orderItemName}>{item.itemName}</Text>

              <Text style={styles.orderItemQuantity}>
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </Text>
            </View>

            <Text style={styles.orderItemTotal}>
              {formatCurrency(item.lineTotal)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.orderTotals}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>

          <Text style={styles.summaryValue}>
            {formatCurrency(jobOrder.subtotal)}
          </Text>
        </View>

        {jobOrder.discountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>

            <Text style={styles.discountValue}>
              -{formatCurrency(jobOrder.discountAmount)}
            </Text>
          </View>
        )}

        <View style={styles.totalDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.orderTotalLabel}>Total</Text>

          <Text style={styles.orderTotalValue}>
            {formatCurrency(jobOrder.total)}
          </Text>
        </View>
      </View>
    </AppCard>
  );
}
