import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { AppCard } from "@/components/ui/AppCard";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";

import { styles } from "@/constants/jobOrderDetailsStyles";

type Props = {
  onVoid: () => void;
  voiding: boolean;
};

export function JobOrderTransactionActions({ onVoid, voiding }: Props) {
  return (
    <AppCard padding={spacing.lg} style={styles.transactionActionCard}>
      <View style={styles.transactionActionHeader}>
        <View style={styles.transactionActionHeaderText}>
          <Text style={styles.transactionActionTitle}>Transaction Actions</Text>

          <Text style={styles.transactionActionSubtitle}>
            Administrative action for correcting a transaction.
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.voidButton,
          pressed && styles.voidButtonPressed,
          voiding && styles.voidButtonDisabled,
        ]}
        onPress={onVoid}
        disabled={voiding}
      >
        <Ionicons name="close-circle-outline" size={20} color={colors.danger} />

        <Text style={styles.voidButtonText}>Void Transaction</Text>
      </Pressable>
    </AppCard>
  );
}
