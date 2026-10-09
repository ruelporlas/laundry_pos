import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import type { Expense } from "@/models/expense";
import { getExpenseById, voidExpense } from "@/repositories/expenseRepository";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function ExpenseDetailsScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAdmin } = useAuth();

  const isTablet = width >= 768;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState("");

  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidReasonError, setVoidReasonError] = useState("");

  const handleBackToExpenses = () => {
    router.replace("/expenses");
  };

  const handleEditExpense = () => {
    if (!expense || expense.isVoided || voiding) {
      return;
    }

    router.push({
      pathname: "/edit-expense",
      params: {
        id: expense.id.toString(),
      },
    });
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadExpense() {
        if (!id) {
          if (isActive) {
            setError("Expense ID is missing.");
            setLoading(false);
          }

          return;
        }

        const expenseId = Number(id);

        if (!Number.isInteger(expenseId) || expenseId <= 0) {
          if (isActive) {
            setError("Invalid expense ID.");
            setLoading(false);
          }

          return;
        }

        try {
          if (isActive) {
            setError("");
            setLoading(true);
          }

          const result = await getExpenseById(expenseId);

          if (!isActive) {
            return;
          }

          if (!result) {
            setExpense(null);
            setError("Expense could not be found.");
            return;
          }

          setExpense(result);
        } catch (error) {
          console.error("Failed to load expense:", error);

          if (isActive) {
            setError(
              error instanceof Error
                ? error.message
                : "Unable to load expense.",
            );
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      }

      loadExpense();

      return () => {
        isActive = false;
      };
    }, [id]),
  );

  const openVoidModal = () => {
    if (!expense || expense.isVoided || !isAdmin || voiding) {
      return;
    }

    setVoidReason("");
    setVoidReasonError("");
    setVoidModalVisible(true);
  };

  const closeVoidModal = () => {
    if (voiding) {
      return;
    }

    setVoidModalVisible(false);
    setVoidReason("");
    setVoidReasonError("");
  };

  const handleVoid = async () => {
    if (!expense || expense.isVoided || !user?.id) {
      return;
    }

    const trimmedReason = voidReason.trim();

    if (!trimmedReason) {
      setVoidReasonError("A void reason is required.");
      return;
    }

    try {
      setVoiding(true);
      setVoidReasonError("");
      setError("");

      const updatedExpense = await voidExpense(
        expense.id,
        user.id,
        trimmedReason,
      );

      setExpense(updatedExpense);
      setVoidModalVisible(false);
      setVoidReason("");
    } catch (error) {
      console.error("Failed to void expense:", error);

      setError(
        error instanceof Error ? error.message : "Unable to void expense.",
      );
    } finally {
      setVoiding(false);
    }
  };

  if (loading && !expense) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="receipt-outline"
          title="Expense Details"
          subtitle="Loading expense..."
          onBack={handleBackToExpenses}
        />

        <LoadingState message="Loading expense..." />
      </View>
    );
  }

  if (error && !expense) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="receipt-outline"
          title="Expense Details"
          subtitle="Expense information"
          onBack={handleBackToExpenses}
        />

        <View style={styles.errorScreen}>
          <ErrorState title="Expense not found" message={error} />

          <AppButton
            title="Back to Expenses"
            icon="arrow-back-outline"
            onPress={handleBackToExpenses}
          />
        </View>
      </View>
    );
  }

  if (!expense) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <PageHero
          icon="receipt-outline"
          title="Expense Details"
          subtitle={expense.categoryName}
          onBack={handleBackToExpenses}
          disabled={voiding}
        />

        <View style={[styles.content, isTablet && styles.contentTablet]}>
          <AppCard style={styles.profileCard}>
            <View
              style={[
                styles.expenseIcon,
                expense.isVoided && styles.expenseIconVoided,
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={38}
                color={expense.isVoided ? colors.danger : colors.primary}
              />
            </View>

            <Text style={styles.categoryName}>{expense.categoryName}</Text>

            <Text
              style={[styles.amount, expense.isVoided && styles.amountVoided]}
            >
              ₱{expense.amount.toFixed(2)}
            </Text>

            <StatusBadge
              label={expense.isVoided ? "Voided" : "Active"}
              variant={expense.isVoided ? "danger" : "success"}
            />
          </AppCard>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="warning-outline"
                size={18}
                color={colors.danger}
              />

              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <AppCard style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Expense Information</Text>

            <InfoRow
              icon="pricetag-outline"
              label="Category"
              value={expense.categoryName}
            />

            <View style={styles.divider} />

            <InfoRow
              icon="document-text-outline"
              label="Description"
              value={expense.description || "No description"}
            />

            <View style={styles.divider} />

            <InfoRow
              icon="cash-outline"
              label="Amount"
              value={`₱${expense.amount.toFixed(2)}`}
              valueStyle={styles.infoAmount}
            />

            <View style={styles.divider} />

            <InfoRow
              icon="calendar-outline"
              label="Expense Date"
              value={expense.expenseDate}
            />

            <View style={styles.divider} />

            <InfoRow
              icon="create-outline"
              label="Notes"
              value={expense.notes || "No notes"}
            />
          </AppCard>

          <AppCard style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Record Information</Text>

            <InfoRow
              icon="person-add-outline"
              label="Created By"
              value={
                expense.createdBy !== null ? `User #${expense.createdBy}` : "—"
              }
            />

            <View style={styles.divider} />

            <InfoRow
              icon="time-outline"
              label="Created At"
              value={formatDateTime(expense.createdAt)}
            />

            {expense.updatedAt ? (
              <>
                <View style={styles.divider} />

                <InfoRow
                  icon="person-outline"
                  label="Updated By"
                  value={
                    expense.updatedBy !== null
                      ? `User #${expense.updatedBy}`
                      : "—"
                  }
                />

                <View style={styles.divider} />

                <InfoRow
                  icon="refresh-outline"
                  label="Updated At"
                  value={formatDateTime(expense.updatedAt)}
                />
              </>
            ) : null}
          </AppCard>

          {expense.isVoided ? (
            <AppCard style={styles.voidedCard}>
              <View style={styles.voidedHeader}>
                <View style={styles.voidedIcon}>
                  <Ionicons
                    name="close-circle-outline"
                    size={22}
                    color={colors.danger}
                  />
                </View>

                <View style={styles.voidedHeaderText}>
                  <Text style={styles.voidedTitle}>Expense Voided</Text>

                  <Text style={styles.voidedSubtitle}>
                    This expense is retained for your records.
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <InfoRow
                icon="alert-circle-outline"
                label="Void Reason"
                value={expense.voidReason || "—"}
                iconColor={colors.danger}
              />

              <View style={styles.divider} />

              <InfoRow
                icon="person-outline"
                label="Voided By"
                value={
                  expense.voidedBy !== null ? `User #${expense.voidedBy}` : "—"
                }
                iconColor={colors.danger}
              />

              <View style={styles.divider} />

              <InfoRow
                icon="time-outline"
                label="Voided At"
                value={formatDateTime(expense.voidedAt)}
                iconColor={colors.danger}
              />
            </AppCard>
          ) : null}

          {!expense.isVoided ? (
            <View style={[styles.actions, isTablet && styles.actionsTablet]}>
              <AppButton
                title="Edit Expense"
                icon="create-outline"
                variant="secondary"
                onPress={handleEditExpense}
                disabled={voiding}
                fullWidth={!isTablet}
              />

              {isAdmin ? (
                <AppButton
                  title="Void Expense"
                  icon="close-circle-outline"
                  variant="danger"
                  onPress={openVoidModal}
                  loading={voiding}
                  disabled={voiding}
                  fullWidth={!isTablet}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={voidModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeVoidModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeVoidModal}>
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons
                  name="close-circle-outline"
                  size={24}
                  color={colors.danger}
                />
              </View>

              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Void Expense</Text>

                <Text style={styles.modalSubtitle}>
                  This expense will remain in your records.
                </Text>
              </View>

              <Pressable
                onPress={closeVoidModal}
                disabled={voiding}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.warningBanner}>
              <Ionicons
                name="warning-outline"
                size={18}
                color={colors.warning}
              />

              <Text style={styles.warningText}>
                Voiding this expense will exclude it from future expense totals
                and reports.
              </Text>
            </View>

            <Text style={styles.reasonLabel}>
              Void Reason
              <Text style={styles.required}> *</Text>
            </Text>

            <TextInput
              value={voidReason}
              onChangeText={(value) => {
                setVoidReason(value);

                if (value.trim()) {
                  setVoidReasonError("");
                }
              }}
              placeholder="Enter the reason for voiding this expense..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!voiding}
              style={[
                styles.reasonInput,
                voidReasonError && styles.reasonInputError,
              ]}
            />

            {voidReasonError ? (
              <Text style={styles.reasonError}>{voidReasonError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                variant="secondary"
                onPress={closeVoidModal}
                disabled={voiding}
                fullWidth
              />

              <AppButton
                title="Void Expense"
                icon="close-circle-outline"
                variant="danger"
                onPress={handleVoid}
                loading={voiding}
                disabled={voiding}
                fullWidth
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueStyle?: object;
  iconColor?: string;
};

function InfoRow({
  icon,
  label,
  value,
  valueStyle,
  iconColor = colors.primary,
}: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>

        <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingBottom: spacing["5xl"],
  },

  content: {
    width: "100%",
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },

  contentTablet: {
    maxWidth: 720,
    alignSelf: "center",
  },

  profileCard: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
  },

  expenseIcon: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
  },

  expenseIconVoided: {
    backgroundColor: colors.dangerLight,
  },

  categoryName: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },

  amount: {
    marginBottom: spacing.md,
    ...typography.h3,
    color: colors.textSecondary,
  },

  amountVoided: {
    color: colors.danger,
    textDecorationLine: "line-through",
  },

  infoCard: {
    padding: spacing.lg,
  },

  sectionTitle: {
    marginBottom: spacing.lg,
    ...typography.h3,
    color: colors.text,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  infoValue: {
    marginTop: 2,
    ...typography.body,
    color: colors.text,
  },

  infoAmount: {
    ...typography.h3,
  },

  divider: {
    height: 1,
    marginVertical: spacing.lg,
    backgroundColor: colors.border,
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  actionsTablet: {
    flexDirection: "row",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  errorBannerText: {
    flex: 1,
    ...typography.small,
    color: colors.danger,
  },

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
  },

  voidedCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },

  voidedHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  voidedIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
  },

  voidedHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  voidedTitle: {
    ...typography.h3,
    color: colors.danger,
  },

  voidedSubtitle: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textSecondary,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(31, 29, 36, 0.45)",
  },

  modalCard: {
    paddingTop: spacing.lg,
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: spacing["2xl"],
    borderTopLeftRadius: theme.radius["2xl"],
    borderTopRightRadius: theme.radius["2xl"],
    backgroundColor: colors.surface,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  modalHeaderIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.dangerLight,
  },

  modalHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },

  modalSubtitle: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.surfaceSoft,
  },

  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.warningLight,
  },

  warningText: {
    flex: 1,
    ...typography.caption,
    color: colors.warning,
  },

  reasonLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    ...typography.small,
    color: colors.text,
  },

  required: {
    color: colors.danger,
  },

  reasonInput: {
    minHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.text,
  },

  reasonInputError: {
    borderColor: colors.danger,
  },

  reasonError: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.danger,
  },

  modalActions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
