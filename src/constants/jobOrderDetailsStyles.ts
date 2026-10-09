import { StyleSheet } from "react-native";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";

export const styles = StyleSheet.create({
  // ---------------------------------------------------------------------------
  // Screen
  // ---------------------------------------------------------------------------

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: PAGE_PADDING,
    paddingBottom: spacing.xl,
  },

  // ---------------------------------------------------------------------------
  // Activity History Link
  // ---------------------------------------------------------------------------

  activityHistoryLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surface,
  },

  activityHistoryLinkPressed: {
    opacity: 0.7,
  },

  activityHistoryLinkIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },

  activityHistoryLinkContent: {
    flex: 1,
    minWidth: 0,
  },

  activityHistoryLinkTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: "700",
  },

  activityHistoryLinkSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  summaryCard: {
    marginBottom: spacing.md,
  },

  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  jobOrderLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  jobOrderNumber: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xs,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    backgroundColor: colors.successLight,
  },

  statusBadgeVoided: {
    backgroundColor: colors.dangerLight,
  },

  statusDot: {
    width: 8,
    height: 8,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    backgroundColor: colors.success,
  },

  statusDotPaid: {
    backgroundColor: colors.success,
  },

  statusDotPartial: {
    backgroundColor: colors.warning,
  },

  statusDotUnpaid: {
    backgroundColor: colors.danger,
  },

  statusDotVoided: {
    backgroundColor: colors.danger,
  },

  statusText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: "700",
  },

  statusTextPaid: {
    color: colors.success,
  },

  statusTextPartial: {
    color: colors.warning,
  },

  statusTextUnpaid: {
    color: colors.danger,
  },

  statusTextVoided: {
    color: colors.danger,
  },

  customerCreatorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
    marginTop: spacing.lg,
  },

  customerBlock: {
    flex: 1,
    minWidth: 0,
  },

  creatorBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
  },

  totalBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  summaryDivider: {
    height: 0,
    marginTop: spacing.md,
  },

  customerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  customerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 28,
  },

  summaryLabel: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },

  summaryValue: {
    ...typography.small,
    color: colors.text,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 0,
  },

  totalLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },

  totalValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: "800",
    textAlign: "right",
  },

  balanceValue: {
    color: colors.danger,
    fontWeight: "700",
  },

  // ---------------------------------------------------------------------------
  // Voided Transaction
  // ---------------------------------------------------------------------------

  voidedCard: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },

  voidedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  voidedTitle: {
    ...typography.body,
    color: colors.danger,
    fontWeight: "700",
  },

  // ---------------------------------------------------------------------------
  // Order Items
  // ---------------------------------------------------------------------------

  itemList: {
    marginTop: spacing.sm,
  },

  orderItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  orderItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  orderItemMain: {
    flex: 1,
    minWidth: 0,
  },

  orderItemName: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },

  orderItemQuantity: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 3,
  },

  orderItemTotal: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 0,
  },

  orderTotals: {
    marginTop: spacing.sm,
  },

  discountValue: {
    ...typography.small,
    color: colors.success,
    fontWeight: "600",
    textAlign: "right",
  },

  totalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  orderTotalLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },

  orderTotalValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: "800",
    textAlign: "right",
  },

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  emptyPayments: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },

  emptyPaymentsText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },

  paymentList: {
    marginTop: spacing.sm,
  },

  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  paymentRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  paymentIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.successLight,
  },

  paymentMain: {
    flex: 1,
    minWidth: 0,
  },

  paymentMethod: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },

  paymentAmount: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 0,
  },

  paymentMeta: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 3,
  },

  paymentAction: {
    marginTop: spacing.md,
  },

  // ---------------------------------------------------------------------------
  // Transaction Actions
  // ---------------------------------------------------------------------------

  transactionActionCard: {
    marginBottom: spacing.md,
  },

  transactionActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  transactionActionHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  transactionActionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },

  transactionActionSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 3,
  },

  voidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: theme.radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },

  voidButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.dangerLight,
  },

  voidButtonDisabled: {
    opacity: 0.5,
  },

  voidButtonText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: "700",
  },

  // ---------------------------------------------------------------------------
  // Claim Stub
  // ---------------------------------------------------------------------------

  stubCard: {
    marginBottom: spacing.md,
  },

  stubHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  stubIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },

  stubHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  stubTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: "700",
  },

  stubSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 3,
  },

  stubPreview: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surfaceSoft,
  },

  stubShopTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: "800",
    textAlign: "center",
  },

  stubDocumentTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },

  stubDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  stubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 3,
  },

  stubLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 0,
  },

  stubValue: {
    ...typography.small,
    color: colors.text,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
  },

  stubItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },

  stubItemMain: {
    flex: 1,
    minWidth: 0,
  },

  stubItemName: {
    ...typography.small,
    color: colors.text,
    fontWeight: "600",
  },

  stubItemQuantity: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  stubItemTotal: {
    ...typography.small,
    color: colors.text,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 0,
  },

  stubTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },

  stubTotalLabel: {
    ...typography.small,
    color: colors.text,
    fontWeight: "700",
  },

  stubTotalValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: "800",
    textAlign: "right",
  },

  stubStatus: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  stubStatusLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "700",
  },

  stubStatusValue: {
    ...typography.small,
    color: colors.success,
    fontWeight: "800",
    marginTop: 2,
  },

  stubStatusValueVoided: {
    color: colors.danger,
  },

  stubFooter: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginTop: spacing.md,
  },

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: PAGE_PADDING,
  },

  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
});
