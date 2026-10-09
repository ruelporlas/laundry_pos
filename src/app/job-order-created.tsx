import { JobOrderActivityLink } from "@/components/job-order/JobOrderActivityLink";
import { JobOrderItemsCard } from "@/components/job-order/JobOrderItemsCard";
import { JobOrderPaymentCard } from "@/components/job-order/JobOrderPaymentCard";
import { JobOrderSummaryCard } from "@/components/job-order/JobOrderSummaryCard";
import { JobOrderTransactionActions } from "@/components/job-order/JobOrderTransactionActions";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { colors } from "@/constants/colors";
import { styles } from "@/constants/jobOrderDetailsStyles";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import { useJobOrderDetails } from "@/hooks/useJobOrderDetails";
import type { AuditChange } from "@/models/auditLog";
import type { PaymentMethod } from "@/models/jobOrder";
import { getAppSettings } from "@/repositories/settingsRepository";
import { printerService } from "@/services/printerService";
import { getReceiptData } from "@/services/receiptService";
import { formatReceiptToEscPos } from "@/utils/escPosFormatter";
import {
  formatActivityChangeValue,
  formatFieldName,
  getActivityConfig,
  getRemovedItems,
} from "@/utils/jobOrderActivity";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

const MAX_CONTENT_WIDTH = 720;

export default function JobOrderCreatedScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const params = useLocalSearchParams<{
    id?: string;
  }>();

  const {
    isAdmin,
    jobOrder,
    items,
    payments,
    activities,
    customer,
    createdByUser,
    voidedByUser,

    loading,
    savingPayment,
    voiding,
    error,

    paymentModalVisible,
    voidModalVisible,
    activityModalVisible,
    selectedActivity,

    paymentMethod,
    paymentAmount,
    cashReceived,
    referenceNumber,
    paymentNote,
    voidReason,

    setCashReceived,
    setReferenceNumber,
    setPaymentNote,
    setVoidReason,

    openActivity,
    closeActivityModal,

    openPaymentModal,
    closePaymentModal,
    handlePaymentAmountChange,
    handlePaymentMethodChange,
    handleSavePayment,

    openVoidModal,
    closeVoidModal,
    handleVoidJobOrder,

    formatCurrency,
  } = useJobOrderDetails({
    id: params.id,
  });

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  function formatDateTime(value: string | null): string {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getStatusLabel(): string {
    if (!jobOrder) {
      return "";
    }

    if (jobOrder.isVoided) {
      return "VOIDED";
    }

    switch (jobOrder.paymentStatus) {
      case "paid":
        return "PAID";

      case "partially_paid":
        return "PARTIALLY PAID";

      case "unpaid":
        return "UNPAID";
    }
  }

  function getPaymentMethodLabel(method: PaymentMethod): string {
    switch (method) {
      case "cash":
        return "Cash";

      case "gcash":
        return "GCash";

      case "other":
        return "Other";
    }
  }

  async function handlePrintReceipt() {
    if (!jobOrder) {
      return;
    }

    if (printerService.getConnectionState() !== "connected") {
      Alert.alert(
        "Printer not connected",
        "Connect your XP-58-H thermal printer before printing the receipt.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Set Up Printer",
            onPress: () => {
              router.push({
                pathname: "/printer-settings",
                params: {
                  jobOrderId: String(jobOrder.id),
                },
              });
            },
          },
        ],
      );

      return;
    }

    try {
      const [receiptData, settings] = await Promise.all([
        getReceiptData(jobOrder.id),
        getAppSettings(),
      ]);

      const receiptBytes = formatReceiptToEscPos(
        receiptData,
        settings.receiptPaperWidth,
      );

      await printerService.print(receiptBytes);

      const printerName =
        printerService.getConnectedDevice()?.name ?? "the printer";

      Alert.alert(
        "Receipt sent",
        `The receipt data for ${jobOrder.jobOrderNumber} was sent to ${printerName}.`,
      );
    } catch (printError) {
      const message =
        printError instanceof Error
          ? printError.message
          : "An unexpected error occurred while printing.";

      Alert.alert("Printing failed", message);
    }
  }

  function handleDone() {
    router.replace("/orders");
  }

  function handleActivityPress() {
    if (activities.length > 0) {
      openActivity(activities[0]);
    }
  }

  if (loading) {
    return <LoadingState message="Loading Job Order..." />;
  }

  if (error || !jobOrder) {
    return (
      <View style={styles.errorScreen}>
        <ErrorState
          title="Unable to load Job Order"
          message={error || "The Job Order could not be loaded."}
        />

        <View style={localStyles.errorAction}>
          <AppButton
            title="Go to Orders"
            icon="receipt-outline"
            onPress={() => router.replace("/orders")}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PageHero
        icon={
          jobOrder.isVoided
            ? "close-circle"
            : jobOrder.paymentStatus === "paid"
              ? "checkmark-circle"
              : "receipt"
        }
        title="Job Order Details"
        subtitle={jobOrder.jobOrderNumber}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: contentWidth,
            paddingBottom: spacing.xl + 24,
          },
        ]}
      >
        <JobOrderSummaryCard
          jobOrder={jobOrder}
          customer={customer}
          createdByUser={createdByUser}
          formatCurrency={formatCurrency}
          getStatusLabel={getStatusLabel}
        />

        {jobOrder.isVoided && (
          <AppCard padding={spacing.lg} style={styles.voidedCard}>
            <View style={styles.voidedHeader}>
              <View style={localStyles.voidedIcon}>
                <Ionicons
                  name="close-circle-outline"
                  size={23}
                  color={colors.danger}
                />
              </View>

              <View style={localStyles.voidedHeaderText}>
                <Text style={styles.voidedTitle}>Transaction Voided</Text>

                <Text style={localStyles.voidedSubtitle}>
                  This transaction is retained for historical records.
                </Text>
              </View>
            </View>

            <View style={localStyles.voidedDivider} />

            <View style={localStyles.voidedInfoRow}>
              <Text style={localStyles.voidedInfoLabel}>VOIDED BY</Text>

              <Text style={localStyles.voidedInfoValue}>
                {voidedByUser?.fullName || "Unknown User"}
              </Text>
            </View>

            <View style={localStyles.voidedInfoRow}>
              <Text style={localStyles.voidedInfoLabel}>VOIDED AT</Text>

              <Text style={localStyles.voidedInfoValue}>
                {formatDateTime(jobOrder.voidedAt)}
              </Text>
            </View>

            <View style={localStyles.voidReasonBlock}>
              <Text style={localStyles.voidedInfoLabel}>REASON</Text>

              <Text style={localStyles.voidReasonText}>
                {jobOrder.voidReason || "No reason recorded."}
              </Text>
            </View>
          </AppCard>
        )}

        <JobOrderItemsCard
          jobOrder={jobOrder}
          items={items}
          formatCurrency={formatCurrency}
        />

        <JobOrderPaymentCard
          jobOrder={jobOrder}
          payments={payments}
          formatCurrency={formatCurrency}
          getPaymentMethodLabel={getPaymentMethodLabel}
          onMakePayment={openPaymentModal}
        />

        <JobOrderActivityLink
          activityCount={activities.length}
          onPress={handleActivityPress}
        />

        {isAdmin && !jobOrder.isVoided && (
          <JobOrderTransactionActions
            onVoid={openVoidModal}
            voiding={voiding}
          />
        )}

        <AppButton
          title="Print Receipt"
          icon="print-outline"
          fullWidth
          onPress={handlePrintReceipt}
        />

        <View style={localStyles.buttonSpacing} />

        <AppButton
          title="Done"
          icon="checkmark"
          fullWidth
          onPress={handleDone}
        />
      </ScrollView>

      {/* Activity Modal */}
      <Modal
        visible={activityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeActivityModal}
      >
        <View style={modalStyles.activityModalContainer}>
          <Pressable
            style={modalStyles.backdrop}
            onPress={closeActivityModal}
          />

          <View style={modalStyles.activityModal}>
            <View style={modalStyles.handle} />

            <View style={modalStyles.header}>
              <View style={modalStyles.headerText}>
                <Text style={modalStyles.title}>Job Order Activity</Text>

                <Text style={modalStyles.subtitle}>
                  {jobOrder.jobOrderNumber}
                </Text>
              </View>

              <Pressable
                style={modalStyles.closeButton}
                onPress={closeActivityModal}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {selectedActivity ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={modalStyles.activityContent}
              >
                <View style={modalStyles.activityDetailHeader}>
                  <View
                    style={[
                      modalStyles.activityIconContainer,
                      {
                        backgroundColor: getActivityConfig(
                          selectedActivity.action,
                        ).backgroundColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getActivityConfig(selectedActivity.action).icon}
                      size={24}
                      color={getActivityConfig(selectedActivity.action).color}
                    />
                  </View>

                  <View style={modalStyles.activityDetailText}>
                    <Text style={modalStyles.activityDetailTitle}>
                      {getActivityConfig(selectedActivity.action).label}
                    </Text>

                    <Text style={modalStyles.activityDetailDate}>
                      {formatDateTime(selectedActivity.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={modalStyles.activityUserRow}>
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color={colors.textMuted}
                  />

                  <Text style={modalStyles.activityUserText}>
                    {selectedActivity.userName}
                  </Text>
                </View>

                {selectedActivity.action === "item_removed" ? (
                  <RemovedItemsSection
                    items={getRemovedItems(selectedActivity)}
                    formatCurrency={formatCurrency}
                  />
                ) : (
                  <ActivityChangesSection
                    changes={selectedActivity.changes}
                    formatValue={formatActivityChangeValue}
                    formatFieldName={formatFieldName}
                  />
                )}

                <View style={modalStyles.bottomSpace} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closePaymentModal}
      >
        <KeyboardAvoidingView
          style={modalStyles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={modalStyles.backdrop} onPress={closePaymentModal} />

          <View style={modalStyles.paymentModal}>
            <View style={modalStyles.handle} />

            <View style={modalStyles.header}>
              <View style={modalStyles.headerText}>
                <Text style={modalStyles.title}>Make Payment</Text>

                <Text style={modalStyles.subtitle}>
                  Balance: {formatCurrency(jobOrder.balance)}
                </Text>
              </View>

              <Pressable
                style={modalStyles.closeButton}
                onPress={closePaymentModal}
                disabled={savingPayment}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={modalStyles.modalContent}
            >
              <Text style={modalStyles.inputLabel}>Payment Amount</Text>

              <View style={modalStyles.amountInputWrapper}>
                <Text style={modalStyles.currencyPrefix}>₱</Text>

                <TextInput
                  value={paymentAmount}
                  onChangeText={handlePaymentAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  style={modalStyles.amountInput}
                />
              </View>

              <Text style={modalStyles.inputHint}>
                Maximum payment: {formatCurrency(jobOrder.balance)}
              </Text>

              <Text style={modalStyles.inputLabel}>Payment Method</Text>

              <View style={modalStyles.methodRow}>
                {[
                  {
                    method: "cash" as PaymentMethod,
                    label: "Cash",
                    icon: "cash-outline" as const,
                  },
                  {
                    method: "gcash" as PaymentMethod,
                    label: "GCash",
                    icon: "phone-portrait-outline" as const,
                  },
                  {
                    method: "other" as PaymentMethod,
                    label: "Other",
                    icon: "card-outline" as const,
                  },
                ].map((option) => {
                  const selected = paymentMethod === option.method;

                  return (
                    <Pressable
                      key={option.method}
                      style={[
                        modalStyles.methodOption,
                        selected && modalStyles.methodOptionSelected,
                      ]}
                      onPress={() => handlePaymentMethodChange(option.method)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={21}
                        color={selected ? colors.primary : colors.textSecondary}
                      />

                      <Text
                        style={[
                          modalStyles.methodLabel,
                          selected && modalStyles.methodLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {paymentMethod === "cash" && (
                <>
                  <Text style={modalStyles.inputLabel}>Cash Received</Text>

                  <TextInput
                    value={cashReceived}
                    onChangeText={setCashReceived}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    style={modalStyles.textInput}
                  />

                  {Number(cashReceived) >= Number(paymentAmount) &&
                    Number(paymentAmount) > 0 && (
                      <View style={modalStyles.changePreview}>
                        <Text style={modalStyles.changeLabel}>Change</Text>

                        <Text style={modalStyles.changeValue}>
                          {formatCurrency(
                            Math.max(
                              Number(cashReceived) - Number(paymentAmount),
                              0,
                            ),
                          )}
                        </Text>
                      </View>
                    )}
                </>
              )}

              {paymentMethod === "gcash" && (
                <>
                  <Text style={modalStyles.inputLabel}>
                    Reference Number
                    <Text style={modalStyles.optionalLabel}> (optional)</Text>
                  </Text>

                  <TextInput
                    value={referenceNumber}
                    onChangeText={setReferenceNumber}
                    placeholder="Enter GCash reference"
                    placeholderTextColor={colors.textMuted}
                    style={modalStyles.textInput}
                    autoCapitalize="characters"
                  />
                </>
              )}

              {paymentMethod === "other" && (
                <>
                  <Text style={modalStyles.inputLabel}>Payment Details</Text>

                  <TextInput
                    value={paymentNote}
                    onChangeText={setPaymentNote}
                    placeholder="e.g. Maya, bank transfer, credit card"
                    placeholderTextColor={colors.textMuted}
                    style={[modalStyles.textInput, modalStyles.textArea]}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              )}

              <View style={modalStyles.balanceCard}>
                <View>
                  <Text style={modalStyles.balanceLabel}>
                    Remaining Balance
                  </Text>

                  <Text style={modalStyles.balanceValue}>
                    {formatCurrency(
                      Math.max(
                        jobOrder.balance - Number(paymentAmount || 0),
                        0,
                      ),
                    )}
                  </Text>
                </View>

                <Ionicons
                  name="wallet-outline"
                  size={25}
                  color={colors.primary}
                />
              </View>

              <AppButton
                title={savingPayment ? "Saving Payment..." : "Save Payment"}
                icon="checkmark-circle-outline"
                fullWidth
                onPress={handleSavePayment}
                disabled={savingPayment}
              />

              <View style={modalStyles.bottomSpace} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Void Modal */}
      <Modal
        visible={voidModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeVoidModal}
      >
        <KeyboardAvoidingView
          style={modalStyles.voidModalContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={modalStyles.backdrop} onPress={closeVoidModal} />

          <View style={modalStyles.voidModal}>
            <View style={modalStyles.voidIcon}>
              <Ionicons
                name="warning-outline"
                size={28}
                color={colors.danger}
              />
            </View>

            <Text style={modalStyles.voidTitle}>Void Job Order?</Text>

            <Text style={modalStyles.voidSubtitle}>
              {jobOrder.jobOrderNumber} will be marked as voided and will no
              longer accept payments.
            </Text>

            <View style={modalStyles.voidWarning}>
              <Ionicons
                name="information-circle-outline"
                size={19}
                color={colors.danger}
              />

              <Text style={modalStyles.voidWarningText}>
                This action cannot be undone. The transaction will remain in the
                records for audit purposes.
              </Text>
            </View>

            <Text style={modalStyles.voidReasonLabel}>Reason for Voiding</Text>

            <TextInput
              value={voidReason}
              onChangeText={setVoidReason}
              placeholder="Enter the reason for voiding this transaction"
              placeholderTextColor={colors.textMuted}
              style={[modalStyles.textInput, modalStyles.voidReasonInput]}
              multiline
              textAlignVertical="top"
              editable={!voiding}
            />

            <View style={modalStyles.voidActions}>
              <Pressable
                style={modalStyles.voidCancelButton}
                onPress={closeVoidModal}
                disabled={voiding}
              >
                <Text style={modalStyles.voidCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  modalStyles.voidConfirmButton,
                  pressed && modalStyles.voidConfirmButtonPressed,
                  voiding && modalStyles.voidConfirmButtonDisabled,
                ]}
                onPress={handleVoidJobOrder}
                disabled={voiding}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={19}
                  color={colors.surface}
                />

                <Text style={modalStyles.voidConfirmText}>
                  {voiding ? "Voiding..." : "Void Transaction"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function RemovedItemsSection({
  items,
  formatCurrency,
}: {
  items: {
    itemName: string;
    itemType?: "product" | "service" | "bundle";
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  formatCurrency: (amount: number) => string;
}) {
  return (
    <View style={modalStyles.changesContainer}>
      <Text style={modalStyles.changesTitle}>Removed Items</Text>

      {items.length === 0 ? (
        <Text style={modalStyles.changesEmpty}>
          No removed item details are available.
        </Text>
      ) : (
        <View>
          {items.map((item, index) => (
            <View
              key={`${item.itemName}-${index}`}
              style={[
                modalStyles.removedItem,
                index < items.length - 1 && modalStyles.removedItemDivider,
              ]}
            >
              <View style={modalStyles.removedItemMain}>
                <Text style={modalStyles.removedItemName}>{item.itemName}</Text>

                {item.itemType ? (
                  <Text style={modalStyles.removedItemType}>
                    {item.itemType === "service"
                      ? "Service"
                      : item.itemType === "bundle"
                        ? "Bundle"
                        : "Product"}
                  </Text>
                ) : null}

                <Text style={modalStyles.removedItemQuantity}>
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>

              {item.lineTotal > 0 ? (
                <Text style={modalStyles.removedItemTotal}>
                  {formatCurrency(item.lineTotal)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ActivityChangesSection({
  changes,
  formatValue,
  formatFieldName,
}: {
  changes: Record<string, AuditChange>;
  formatValue: (value: unknown) => string;
  formatFieldName: (value: string) => string;
}) {
  const entries = Object.entries(changes);

  return (
    <View style={modalStyles.changesContainer}>
      <Text style={modalStyles.changesTitle}>Details</Text>

      {entries.length === 0 ? (
        <Text style={modalStyles.changesEmpty}>
          No additional details were recorded.
        </Text>
      ) : (
        <View>
          {entries.map(([field, change]) => (
            <View key={field} style={modalStyles.changeRow}>
              <Text style={modalStyles.changeField}>
                {formatFieldName(field)}
              </Text>

              <View style={modalStyles.changeValues}>
                <Text style={modalStyles.changeFrom}>
                  {formatValue(change.from)}
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color={colors.textMuted}
                />

                <Text style={modalStyles.changeTo}>
                  {formatValue(change.to)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  errorAction: {
    paddingHorizontal: PAGE_PADDING,
    marginTop: spacing.md,
  },

  buttonSpacing: {
    height: spacing.md,
  },

  voidedIcon: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerLight,
  },

  voidedHeaderText: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  voidedSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  voidedDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  voidedInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.xs,
  },

  voidedInfoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
  },

  voidedInfoValue: {
    ...typography.small,
    color: colors.text,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: spacing.md,
  },

  voidReasonBlock: {
    marginTop: spacing.sm,
  },

  voidReasonText: {
    ...typography.small,
    color: colors.text,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
});

const modalStyles = StyleSheet.create({
  activityModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },

  voidModalContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },

  activityModal: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: theme.radius["2xl"],
    borderTopRightRadius: theme.radius["2xl"],
    overflow: "hidden",
  },

  paymentModal: {
    width: "100%",
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: theme.radius["2xl"],
    borderTopRightRadius: theme.radius["2xl"],
    overflow: "hidden",
  },

  handle: {
    width: 42,
    height: 4,
    borderRadius: theme.radius.full,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },

  title: {
    ...typography.h3,
    color: colors.text,
  },

  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSoft,
  },

  activityContent: {
    padding: PAGE_PADDING,
    paddingBottom: spacing.xl,
  },

  activityDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },

  activityDetailText: {
    flex: 1,
  },

  activityDetailTitle: {
    ...typography.h3,
    color: colors.text,
  },

  activityDetailDate: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  activityUserRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },

  activityUserText: {
    ...typography.small,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },

  changesContainer: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },

  changesTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },

  changesEmpty: {
    ...typography.small,
    color: colors.textMuted,
  },

  changeRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  changeField: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },

  changeValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },

  changeFrom: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },

  changeTo: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
    flex: 1,
  },

  removedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },

  removedItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  removedItemMain: {
    flex: 1,
    paddingRight: spacing.md,
  },

  removedItemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },

  removedItemType: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  removedItemQuantity: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  removedItemTotal: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },

  bottomSpace: {
    height: spacing.xl,
  },

  modalContent: {
    padding: PAGE_PADDING,
    paddingBottom: spacing.xl,
  },

  inputLabel: {
    ...typography.small,
    color: colors.text,
    fontWeight: "700",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },

  amountInputWrapper: {
    position: "relative",
    justifyContent: "center",
  },

  currencyPrefix: {
    position: "absolute",
    left: spacing.md,
    zIndex: 1,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },

  amountInput: {
    ...typography.h3,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surface,
    paddingLeft: spacing.xl + spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
  },

  inputHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  methodRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  methodOption: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },

  methodOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  methodLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  methodLabelSelected: {
    color: colors.primary,
  },

  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },

  textArea: {
    minHeight: 100,
  },

  optionalLabel: {
    color: colors.textMuted,
    fontWeight: "400",
  },

  changePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.successLight,
  },

  changeLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  changeValue: {
    ...typography.body,
    color: colors.success,
    fontWeight: "700",
  },

  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.primaryLight,
  },

  balanceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  balanceValue: {
    ...typography.h3,
    color: colors.primary,
    marginTop: spacing.xs,
  },

  voidModal: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: theme.radius["2xl"],
    padding: PAGE_PADDING,
  },

  voidIcon: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerLight,
    alignSelf: "center",
    marginBottom: spacing.md,
  },

  voidTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },

  voidSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  voidWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.dangerLight,
    borderRadius: theme.radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },

  voidWarningText: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 19,
  },

  voidReasonLabel: {
    ...typography.small,
    color: colors.text,
    fontWeight: "700",
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },

  voidReasonInput: {
    minHeight: 110,
  },

  voidActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  voidCancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  voidCancelText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "700",
  },

  voidConfirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },

  voidConfirmButtonPressed: {
    opacity: 0.7,
  },

  voidConfirmButtonDisabled: {
    opacity: 0.5,
  },

  voidConfirmText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: "700",
  },
});
