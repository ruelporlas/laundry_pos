import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { AppSelect } from "@/components/ui/AppSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { FEATURES } from "@/entitlements/features";
import { useFeature } from "@/entitlements/useFeature";
import type {
  AuditAction,
  AuditChange,
  AuditEntityType,
  AuditLog,
} from "@/models/auditLog";
import { getAuditLogs } from "@/repositories/auditLogRepository";

type DateFilter = "all" | "7" | "30" | "60";

const ACTION_FILTERS: {
  value: AuditAction | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "activated", label: "Activated" },
  { value: "deactivated", label: "Deactivated" },
  { value: "voided", label: "Voided" },
  { value: "deleted", label: "Deleted" },
  { value: "item_removed", label: "Item Removed" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "password_changed", label: "Password Changed" },
  { value: "password_reset", label: "Password Reset" },
  { value: "payment_added", label: "Payment Added" },
  { value: "other", label: "Other" },
];

const ENTITY_FILTERS: {
  value: AuditEntityType | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "user", label: "Users" },
  { value: "customer", label: "Customers" },
  { value: "product", label: "Products" },
  { value: "service", label: "Services" },
  { value: "bundle", label: "Bundles" },
  { value: "job_order", label: "Job Orders" },
  { value: "payment", label: "Payments" },
  { value: "expense", label: "Expenses" },
  { value: "expense_category", label: "Expense Categories" },
  { value: "settings", label: "Settings" },
  { value: "other", label: "Other" },
];

const DATE_FILTERS: {
  value: DateFilter;
  label: string;
}[] = [
  { value: "all", label: "All Time" },
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "60", label: "60 Days" },
];

export default function ActivityLogScreen() {
  const isEnabled = useFeature(FEATURES.AUDIT_LOG);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | "all">(
    "all",
  );
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const loadLogs = useCallback(async () => {
    try {
      setError(null);

      const result = await getAuditLogs();

      setLogs(result);
    } catch (loadError) {
      console.error("Failed to load activity log:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load the activity log.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadLogs();
    } finally {
      setRefreshing(false);
    }
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) {
        return false;
      }

      if (entityFilter !== "all" && log.entityType !== entityFilter) {
        return false;
      }

      if (dateFilter !== "all") {
        const createdAt = new Date(log.createdAt);

        if (Number.isNaN(createdAt.getTime())) {
          return false;
        }

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - Number(dateFilter));

        if (createdAt < cutoff) {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        log.userName,
        log.action,
        log.entityType,
        log.entityName,
        log.entityId?.toString() ?? "",
        getActionConfig(log.action).label,
        getEntityLabel(log.entityType),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [logs, searchQuery, actionFilter, entityFilter, dateFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    actionFilter !== "all" ||
    entityFilter !== "all" ||
    dateFilter !== "all";

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setActionFilter("all");
    setEntityFilter("all");
    setDateFilter("all");
  }, []);

  if (!isEnabled) {
    return (
      <View style={styles.screen}>
        <PageHero
          icon="time-outline"
          title="Activity Log"
          subtitle="Review important activity across your POS"
        />

        <View style={styles.contentInner}>
          <AppCard padding={spacing.xl}>
            <View style={styles.disabledContent}>
              <View style={styles.disabledIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={28}
                  color={colors.textMuted}
                />
              </View>

              <Text style={styles.disabledTitle}>Activity Log Unavailable</Text>

              <Text style={styles.disabledMessage}>
                This feature is not currently enabled for this POS.
              </Text>
            </View>
          </AppCard>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        <PageHero
          icon="time-outline"
          title="Activity Log"
          subtitle="Review important activity across your POS"
        />

        <View style={styles.contentInner}>
          <View style={styles.filtersContainer}>
            <AppInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search activity..."
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />

            <View style={styles.filterColumns}>
              <View style={styles.filterColumn}>
                <AppSelect
                  label="Action"
                  value={actionFilter}
                  options={ACTION_FILTERS}
                  onChange={setActionFilter}
                />
              </View>

              <View style={styles.filterColumn}>
                <AppSelect
                  label="Module"
                  value={entityFilter}
                  options={ENTITY_FILTERS}
                  onChange={setEntityFilter}
                />
              </View>
            </View>

            <AppSelect
              label="Date"
              value={dateFilter}
              options={DATE_FILTERS}
              onChange={setDateFilter}
            />

            <View style={styles.filterSummary}>
              <Text style={styles.resultCount}>
                Showing {filteredLogs.length}{" "}
                {filteredLogs.length === 1 ? "activity" : "activities"}
              </Text>

              {hasActiveFilters ? (
                <Text style={styles.clearFilters} onPress={clearFilters}>
                  Clear
                </Text>
              ) : null}
            </View>
          </View>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : logs.length === 0 ? (
            <EmptyState
              icon="time-outline"
              title="No Activity Yet"
              message="Important activity will appear here as users make changes in the POS."
            />
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="No Matching Activity"
              message="Try changing your search or filters to find the activity you are looking for."
            />
          ) : (
            <View style={styles.logList}>
              {filteredLogs.map((log) => (
                <ActivityLogCard key={log.id} log={log} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ActivityLogCard({ log }: { log: AuditLog }) {
  const action = getActionConfig(log.action);
  const entityLabel = getEntityLabel(log.entityType);

  return (
    <AppCard padding={spacing.lg}>
      <View style={styles.activityHeader}>
        <View
          style={[
            styles.activityIcon,
            {
              backgroundColor: action.backgroundColor,
            },
          ]}
        >
          <Ionicons name={action.icon} size={22} color={action.color} />
        </View>

        <View style={styles.activityHeaderContent}>
          <View style={styles.activityTitleRow}>
            <Text style={styles.activityTitle}>{action.label}</Text>

            <Text style={styles.activityDate}>
              {formatDateTime(log.createdAt)}
            </Text>
          </View>

          <Text style={styles.activityEntity}>
            {entityLabel}
            {log.entityName ? ` · ${log.entityName}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <Ionicons name="person-outline" size={15} color={colors.textMuted} />

        <Text style={styles.metaText}>{log.userName}</Text>
      </View>

      {log.changes && Object.keys(log.changes).length > 0 ? (
        <ChangesSection changes={log.changes} entityType={log.entityType} />
      ) : null}
    </AppCard>
  );
}

function ChangesSection({
  changes,
  entityType,
}: {
  changes: Record<string, AuditChange>;
  entityType: AuditEntityType;
}) {
  return (
    <View style={styles.changesContainer}>
      <Text style={styles.changesTitle}>Changes</Text>

      <View style={styles.changesList}>
        {Object.entries(changes).map(([field, change]) => (
          <View key={field} style={styles.changeRow}>
            <Text style={styles.changeField}>{formatFieldName(field)}</Text>

            {entityType === "bundle" && field === "items" ? (
              <BundleItemsChange change={change} />
            ) : (
              <View style={styles.changeValues}>
                <Text style={styles.changeFrom}>
                  {formatValue(change.from)}
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color={colors.textMuted}
                />

                <Text style={styles.changeTo}>{formatValue(change.to)}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function BundleItemsChange({ change }: { change: AuditChange }) {
  return (
    <View style={styles.bundleItemsChange}>
      <View style={styles.bundleItemsSide}>
        <Text style={styles.bundleItemsLabel}>Before</Text>

        <Text style={styles.bundleItemsText}>
          {formatBundleItems(change.from)}
        </Text>
      </View>

      <View style={styles.bundleItemsArrow}>
        <Ionicons name="arrow-down" size={16} color={colors.textMuted} />
      </View>

      <View style={styles.bundleItemsSide}>
        <Text style={styles.bundleItemsLabel}>After</Text>

        <Text style={styles.bundleItemsText}>
          {formatBundleItems(change.to)}
        </Text>
      </View>
    </View>
  );
}

function formatBundleItems(value: unknown): string {
  if (!Array.isArray(value)) {
    return formatValue(value);
  }

  if (value.length === 0) {
    return "No items";
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return String(item);
      }

      const bundleItem = item as Record<string, unknown>;

      const itemType =
        bundleItem.itemType === "service" ? "Service" : "Product";

      const itemName =
        typeof bundleItem.itemName === "string" && bundleItem.itemName.trim()
          ? bundleItem.itemName
          : typeof bundleItem.itemId === "number"
            ? `${itemType} #${bundleItem.itemId}`
            : itemType;

      const quantity =
        typeof bundleItem.quantity === "number" ? bundleItem.quantity : null;

      return quantity !== null ? `${itemName} × ${quantity}` : itemName;
    })
    .join(" · ");
}

function getActionConfig(action: AuditAction): {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
} {
  switch (action) {
    case "created":
      return {
        label: "Created",
        icon: "add-circle-outline",
        color: colors.success,
        backgroundColor: colors.successLight,
      };

    case "updated":
      return {
        label: "Updated",
        icon: "create-outline",
        color: colors.primary,
        backgroundColor: colors.primaryLight,
      };

    case "activated":
      return {
        label: "Activated",
        icon: "checkmark-circle-outline",
        color: colors.success,
        backgroundColor: colors.successLight,
      };

    case "deactivated":
      return {
        label: "Deactivated",
        icon: "pause-circle-outline",
        color: colors.warning,
        backgroundColor: colors.warningLight,
      };

    case "voided":
      return {
        label: "Voided",
        icon: "close-circle-outline",
        color: colors.danger,
        backgroundColor: colors.dangerLight,
      };

    case "deleted":
      return {
        label: "Deleted",
        icon: "trash-outline",
        color: colors.danger,
        backgroundColor: colors.dangerLight,
      };

    case "item_removed":
      return {
        label: "Item Removed",
        icon: "trash-outline",
        color: colors.danger,
        backgroundColor: colors.dangerLight,
      };

    case "login":
      return {
        label: "Logged In",
        icon: "log-in-outline",
        color: colors.success,
        backgroundColor: colors.successLight,
      };

    case "logout":
      return {
        label: "Logged Out",
        icon: "log-out-outline",
        color: colors.textSecondary,
        backgroundColor: colors.surfaceSoft,
      };

    case "password_changed":
      return {
        label: "Password Changed",
        icon: "key-outline",
        color: colors.primary,
        backgroundColor: colors.primaryLight,
      };

    case "password_reset":
      return {
        label: "Password Reset",
        icon: "key-outline",
        color: colors.warning,
        backgroundColor: colors.warningLight,
      };

    case "payment_added":
      return {
        label: "Payment Added",
        icon: "card-outline",
        color: colors.success,
        backgroundColor: colors.successLight,
      };

    case "other":
    default:
      return {
        label: "Activity",
        icon: "information-circle-outline",
        color: colors.textSecondary,
        backgroundColor: colors.surfaceSoft,
      };
  }
}

function getEntityLabel(entityType: AuditEntityType): string {
  switch (entityType) {
    case "user":
      return "User";

    case "customer":
      return "Customer";

    case "product":
      return "Product";

    case "service":
      return "Service";

    case "bundle":
      return "Bundle";

    case "job_order":
      return "Job Order";

    case "payment":
      return "Payment";

    case "expense":
      return "Expense";

    case "expense_category":
      return "Expense Category";

    case "settings":
      return "Settings";

    case "other":
    default:
      return "Other";
  }
}

function formatDateTime(value: string): string {
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

function formatFieldName(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "object") {
    return "Details changed";
  }

  return String(value);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingBottom: spacing["4xl"],
  },

  contentInner: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing["2xl"],
  },

  filtersContainer: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },

  searchInput: {
    minHeight: 48,
  },

  filterColumns: {
    flexDirection: "row",
    gap: spacing.md,
  },

  filterColumn: {
    flex: 1,
    minWidth: 0,
  },

  filterSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },

  resultCount: {
    ...typography.caption,
    color: colors.textMuted,
  },

  clearFilters: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: "600",
  },

  logList: {
    gap: spacing.md,
  },

  activityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  activityHeaderContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  activityTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  activityTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 1,
  },

  activityDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    textAlign: "right",
  },

  activityEntity: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metaText: {
    ...typography.small,
    color: colors.textSecondary,
  },

  changesContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
  },

  changesTitle: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  changesList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },

  changeRow: {
    gap: 4,
  },

  changeField: {
    ...typography.caption,
    color: colors.textMuted,
  },

  changeValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  changeFrom: {
    ...typography.small,
    color: colors.textSecondary,
    flexShrink: 1,
  },

  changeTo: {
    ...typography.small,
    color: colors.text,
    fontWeight: "600",
    flexShrink: 1,
  },

  bundleItemsChange: {
    gap: spacing.xs,
  },

  bundleItemsSide: {
    gap: 2,
  },

  bundleItemsLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
  },

  bundleItemsText: {
    ...typography.small,
    color: colors.text,
    lineHeight: 20,
  },

  bundleItemsArrow: {
    alignItems: "center",
    paddingVertical: 2,
  },

  disabledContent: {
    alignItems: "center",
  },

  disabledIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: "center",
  },

  disabledMessage: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
