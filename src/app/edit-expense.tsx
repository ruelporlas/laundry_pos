import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { PageHero } from "@/components/ui/PageHero";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import type { Expense, ExpenseCategory } from "@/models/expense";
import {
  getActiveExpenseCategories,
  getExpenseById,
  updateExpense,
} from "@/repositories/expenseRepository";

export default function EditExpenseScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const isTablet = width >= 768;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [notes, setNotes] = useState("");

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [categoryError, setCategoryError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!id) {
        if (mounted) {
          setError("Expense ID is missing.");
          setLoading(false);
        }

        return;
      }

      const expenseId = Number(id);

      if (!Number.isInteger(expenseId) || expenseId <= 0) {
        if (mounted) {
          setError("Invalid expense ID.");
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const [expenseResult, categoriesResult] = await Promise.all([
          getExpenseById(expenseId),
          getActiveExpenseCategories(),
        ]);

        if (!mounted) {
          return;
        }

        if (!expenseResult) {
          setError("Expense could not be found.");
          return;
        }

        if (expenseResult.isVoided) {
          setExpense(expenseResult);
          setError("Voided expenses cannot be edited.");
          return;
        }

        setExpense(expenseResult);
        setCategories(categoriesResult);

        setCategoryId(expenseResult.categoryId);
        setDescription(expenseResult.description);
        setAmount(expenseResult.amount.toFixed(2));
        setExpenseDate(expenseResult.expenseDate);
        setNotes(expenseResult.notes);
      } catch (error) {
        console.error("Failed to load expense for editing:", error);

        if (mounted) {
          setError(
            error instanceof Error ? error.message : "Unable to load expense.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [id]);

  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );

  const handleBackToDetails = () => {
    if (!id) {
      router.replace("/expenses");
      return;
    }

    router.replace({
      pathname: "/expense-details",
      params: {
        id: String(id),
      },
    });
  };

  const handleSave = async () => {
    let hasError = false;

    setCategoryError("");
    setAmountError("");
    setDateError("");
    setError("");

    if (!categoryId) {
      setCategoryError("Expense category is required.");
      hasError = true;
    }

    const trimmedAmount = amount.trim();
    const numericAmount = Number(trimmedAmount);

    if (!trimmedAmount) {
      setAmountError("Expense amount is required.");
      hasError = true;
    } else if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setAmountError("Enter a valid expense amount.");
      hasError = true;
    }

    const trimmedDate = expenseDate.trim();

    if (!trimmedDate) {
      setDateError("Expense date is required.");
      hasError = true;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setDateError("Use the date format YYYY-MM-DD.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (!expense) {
      setError("Expense information could not be loaded.");
      return;
    }

    if (expense.isVoided) {
      setError("Voided expenses cannot be edited.");
      return;
    }

    if (!user?.id) {
      setError("Your user session could not be identified.");
      return;
    }

    try {
      setSaving(true);

      await updateExpense(
        expense.id,
        {
          categoryId: categoryId as number,
          description,
          amount: numericAmount,
          expenseDate: trimmedDate,
          notes,
        },
        user.id,
      );

      router.replace({
        pathname: "/expense-details",
        params: {
          id: expense.id.toString(),
        },
      });
    } catch (error) {
      console.error("Failed to update expense:", error);

      setError(
        error instanceof Error ? error.message : "Unable to update expense.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="create-outline"
          title="Edit Expense"
          subtitle="Loading expense..."
          onBack={handleBackToDetails}
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading expense...</Text>
        </View>
      </View>
    );
  }

  if (error && !expense) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="create-outline"
          title="Edit Expense"
          subtitle="Expense information"
          onBack={handleBackToDetails}
        />

        <View style={styles.errorScreen}>
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={20} color={colors.danger} />

            <Text style={styles.errorText}>{error}</Text>
          </View>

          <AppButton
            title="Back to Expense Details"
            icon="arrow-back-outline"
            onPress={handleBackToDetails}
          />
        </View>
      </View>
    );
  }

  if (!expense) {
    return null;
  }

  if (expense.isVoided) {
    return (
      <View style={styles.container}>
        <PageHero
          icon="create-outline"
          title="Edit Expense"
          subtitle="Expense information"
          onBack={handleBackToDetails}
        />

        <View style={styles.errorScreen}>
          <View style={styles.errorBanner}>
            <Ionicons
              name="close-circle-outline"
              size={20}
              color={colors.danger}
            />

            <Text style={styles.errorText}>
              Voided expenses cannot be edited.
            </Text>
          </View>

          <AppButton
            title="Back to Expense Details"
            icon="arrow-back-outline"
            onPress={handleBackToDetails}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <PageHero
            icon="create-outline"
            title="Edit Expense"
            subtitle={expense.categoryName}
            onBack={handleBackToDetails}
            disabled={saving}
          />

          <View style={[styles.content, isTablet && styles.contentTablet]}>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color={colors.danger}
                />

                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <AppCard style={styles.formCard}>
              <View style={styles.formHeader}>
                <View style={styles.formHeaderIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.formHeaderText}>
                  <Text style={styles.formTitle}>Expense Information</Text>

                  <Text style={styles.formSubtitle}>
                    Update the expense details below.
                  </Text>
                </View>
              </View>

              <View style={styles.form}>
                <View>
                  <Text style={styles.label}>
                    Expense Category
                    <Text style={styles.required}> *</Text>
                  </Text>

                  <Pressable
                    onPress={() => setCategoryModalVisible(true)}
                    disabled={saving || categories.length === 0}
                    style={({ pressed }) => [
                      styles.selector,
                      categoryError ? styles.selectorError : null,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.selectorContent}>
                      <Ionicons
                        name="pricetag-outline"
                        size={20}
                        color={colors.textMuted}
                      />

                      <Text
                        style={[
                          styles.selectorText,
                          !selectedCategory && styles.selectorPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {selectedCategory?.name ?? "Select a category"}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>

                  {categoryError ? (
                    <Text style={styles.fieldError}>{categoryError}</Text>
                  ) : null}
                </View>

                <AppInput
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Monthly electricity bill"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  editable={!saving}
                />

                <AppInput
                  label="Amount"
                  value={amount}
                  onChangeText={(value) => {
                    setAmount(value);

                    if (value.trim()) {
                      setAmountError("");
                    }
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  required
                  error={amountError}
                  editable={!saving}
                />

                <AppInput
                  label="Expense Date"
                  value={expenseDate}
                  onChangeText={(value) => {
                    setExpenseDate(value);

                    if (value.trim()) {
                      setDateError("");
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  required
                  error={dateError}
                  editable={!saving}
                />

                <AppInput
                  label="Notes"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes"
                  autoCapitalize="sentences"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={styles.notesInput}
                  editable={!saving}
                />
              </View>

              <View style={styles.amountHint}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.textMuted}
                />

                <Text style={styles.amountHintText}>
                  Update the expense amount in Philippine pesos.
                </Text>
              </View>
            </AppCard>

            <View style={[styles.actions, isTablet && styles.actionsTablet]}>
              <AppButton
                title="Cancel"
                variant="secondary"
                onPress={handleBackToDetails}
                disabled={saving}
                fullWidth={!isTablet}
              />

              <AppButton
                title="Save Changes"
                icon="checkmark"
                onPress={handleSave}
                loading={saving}
                disabled={saving || categories.length === 0}
                fullWidth={!isTablet}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCategoryModalVisible(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Expense Category</Text>

                <Text style={styles.modalSubtitle}>
                  Choose a category for this expense.
                </Text>
              </View>

              <Pressable
                onPress={() => setCategoryModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {categories.map((category) => {
                const selected = category.id === categoryId;

                return (
                  <Pressable
                    key={category.id}
                    onPress={() => {
                      setCategoryId(category.id);
                      setCategoryError("");
                      setCategoryModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.categoryOption,
                      selected && styles.categoryOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryOptionIcon,
                        selected && styles.categoryOptionIconSelected,
                      ]}
                    >
                      <Ionicons
                        name="pricetag-outline"
                        size={18}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                    </View>

                    <View style={styles.categoryOptionContent}>
                      <Text
                        style={[
                          styles.categoryOptionName,
                          selected && styles.categoryOptionNameSelected,
                        ]}
                      >
                        {category.name}
                      </Text>

                      {category.description ? (
                        <Text
                          style={styles.categoryOptionDescription}
                          numberOfLines={1}
                        >
                          {category.description}
                        </Text>
                      ) : null}
                    </View>

                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  flex: {
    flex: 1,
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

  formCard: {
    padding: spacing.lg,
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  formHeaderIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  formHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  formTitle: {
    ...typography.h3,
    color: colors.text,
  },

  formSubtitle: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  form: {
    gap: spacing.lg,
  },

  label: {
    marginBottom: spacing.sm,
    ...typography.small,
    color: colors.text,
  },

  required: {
    color: colors.danger,
  },

  selector: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  selectorError: {
    borderColor: colors.danger,
  },

  selectorContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  selectorText: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.body,
    color: colors.text,
  },

  selectorPlaceholder: {
    color: colors.textMuted,
  },

  fieldError: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.danger,
  },

  notesInput: {
    minHeight: 90,
    paddingTop: spacing.md,
  },

  amountHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  amountHintText: {
    flex: 1,
    ...typography.caption,
    color: colors.textMuted,
  },

  actions: {
    gap: spacing.md,
    marginTop: spacing.xs,
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

  errorText: {
    flex: 1,
    ...typography.small,
    color: colors.danger,
  },

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    paddingHorizontal: PAGE_PADDING,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
  },

  loadingText: {
    marginTop: spacing.md,
    ...typography.small,
    color: colors.textSecondary,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(31, 29, 36, 0.45)",
  },

  modalCard: {
    maxHeight: "80%",
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
    justifyContent: "space-between",
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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

  categoryList: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },

  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    padding: spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  categoryOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  categoryOptionIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.surfaceSoft,
  },

  categoryOptionIconSelected: {
    backgroundColor: colors.surface,
  },

  categoryOptionContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },

  categoryOptionName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  categoryOptionNameSelected: {
    color: colors.primaryDark,
  },

  categoryOptionDescription: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },

  pressed: {
    opacity: 0.8,
  },
});
