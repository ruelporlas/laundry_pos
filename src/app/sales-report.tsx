import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  DimensionValue,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { AppCard } from "@/components/ui/AppCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";

import {
  getSalesReport,
  type SalesReport,
  type SalesReportDateRange,
} from "@/repositories/reportRepository";

type DatePreset = "today" | "week" | "month" | "custom";

const MAX_CONTENT_WIDTH = 1200;

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayRange(): SalesReportDateRange {
  const today = new Date();
  const date = formatDate(today);

  return {
    startDate: date,
    endDate: date,
  };
}

function getWeekRange(): SalesReportDateRange {
  const today = new Date();

  const day = today.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);

  return {
    startDate: formatDate(monday),
    endDate: formatDate(today),
  };
}

function getMonthRange(): SalesReportDateRange {
  const today = new Date();

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(today),
  };
}

function formatReportDate(date: string): string {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDailyDate(date: string): string {
  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  const parsed = new Date(Number(year), Number(month) - 1, Number(day));

  return parsed.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function parseReportDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function getPresetLabel(preset: DatePreset): string {
  switch (preset) {
    case "today":
      return "Today";

    case "week":
      return "This Week";

    case "month":
      return "This Month";

    case "custom":
      return "Custom Date";
  }
}

export default function SalesReportScreen() {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  const [datePreset, setDatePreset] = useState<DatePreset>("today");

  const [dateRange, setDateRange] =
    useState<SalesReportDateRange>(getTodayRange());

  const [customStartDate, setCustomStartDate] = useState(dateRange.startDate);
  const [customEndDate, setCustomEndDate] = useState(dateRange.endDate);

  const [showDateOptions, setShowDateOptions] = useState(false);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [report, setReport] = useState<SalesReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (range: SalesReportDateRange) => {
    try {
      setError(null);
      setLoading(true);

      const result = await getSalesReport(range);

      setReport(result);
    } catch (error) {
      console.error("Failed to load report:", error);

      setReport(null);

      setError(
        error instanceof Error ? error.message : "Unable to load the report.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReport(dateRange);
    }, [dateRange, loadReport]),
  );

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const result = await getSalesReport(dateRange);

      setReport(result);
    } catch (error) {
      console.error("Failed to refresh report:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to refresh the report.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [dateRange]);

  const handlePresetChange = useCallback(
    (preset: DatePreset) => {
      setDatePreset(preset);

      setShowStartDatePicker(false);
      setShowEndDatePicker(false);

      if (preset !== "custom") {
        setShowDateOptions(false);
      }

      if (preset === "today") {
        const range = getTodayRange();

        setDateRange(range);
        setCustomStartDate(range.startDate);
        setCustomEndDate(range.endDate);

        return;
      }

      if (preset === "week") {
        const range = getWeekRange();

        setDateRange(range);
        setCustomStartDate(range.startDate);
        setCustomEndDate(range.endDate);

        return;
      }

      if (preset === "month") {
        const range = getMonthRange();

        setDateRange(range);
        setCustomStartDate(range.startDate);
        setCustomEndDate(range.endDate);

        return;
      }

      if (preset === "custom") {
        setCustomStartDate(dateRange.startDate);
        setCustomEndDate(dateRange.endDate);
      }
    },
    [dateRange],
  );

  const applyCustomDate = useCallback(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(customStartDate)) {
      setError("Start date must use YYYY-MM-DD format.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(customEndDate)) {
      setError("End date must use YYYY-MM-DD format.");
      return;
    }

    if (customStartDate > customEndDate) {
      setError("Start date cannot be after the end date.");
      return;
    }

    setError(null);
    setDatePreset("custom");

    setDateRange({
      startDate: customStartDate,
      endDate: customEndDate,
    });

    setShowDateOptions(false);
  }, [customEndDate, customStartDate]);

  const breakdownTotal = useMemo(() => {
    if (!report) {
      return 0;
    }

    return (
      report.salesBreakdown.services +
      report.salesBreakdown.products +
      report.salesBreakdown.bundles
    );
  }, [report]);

  const getBreakdownWidth = useCallback(
    (value: number): DimensionValue => {
      if (breakdownTotal <= 0) {
        return "0%";
      }

      return `${Math.min(100, Math.max(0, (value / breakdownTotal) * 100))}%`;
    },
    [breakdownTotal],
  );

  if (loading && !report) {
    return (
      <View style={styles.container}>
        <View style={styles.heroWrapper}>
          <PageHero
            icon="bar-chart-outline"
            title="Report"
            subtitle="Review sales, collections and expenses"
          />
        </View>

        <View style={styles.centerState}>
          <LoadingState message="Loading Report..." />
        </View>
      </View>
    );
  }

  if (error && !report) {
    return (
      <View style={styles.container}>
        <View style={styles.heroWrapper}>
          <PageHero
            icon="bar-chart-outline"
            title="Report"
            subtitle="Review sales, collections and expenses"
          />
        </View>

        <View style={styles.centerState}>
          <ErrorState title="Unable to load report" message={error} />

          <Pressable
            onPress={() => loadReport(dateRange)}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.white} />

            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrapper}>
          <PageHero
            icon="bar-chart-outline"
            title="Report"
            subtitle="Review sales, collections and expenses"
          />
        </View>

        <View
          style={[
            styles.content,
            {
              width: contentWidth,
            },
          ]}
        >
          <View style={styles.dateSection}>
            <SectionHeader
              icon="calendar-outline"
              title="Report Period"
              subtitle={`${formatReportDate(
                dateRange.startDate,
              )} – ${formatReportDate(dateRange.endDate)}`}
            />

            <Pressable
              style={styles.dateSelector}
              onPress={() => {
                setShowDateOptions((current) => !current);
                setShowStartDatePicker(false);
                setShowEndDatePicker(false);
              }}
            >
              <View style={styles.dateSelectorLeft}>
                <View style={styles.dateIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>

                <View>
                  <Text style={styles.dateSelectorLabel}>Date Range</Text>

                  <Text style={styles.dateSelectorValue}>
                    {getPresetLabel(datePreset)}
                  </Text>
                </View>
              </View>

              <Ionicons
                name={showDateOptions ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            {showDateOptions ? (
              <AppCard padding={spacing.sm} style={styles.dateOptionsCard}>
                {(["today", "week", "month", "custom"] as DatePreset[]).map(
                  (preset) => {
                    const selected = datePreset === preset;

                    return (
                      <Pressable
                        key={preset}
                        style={[
                          styles.dateOption,
                          selected && styles.dateOptionSelected,
                        ]}
                        onPress={() => handlePresetChange(preset)}
                      >
                        <Text
                          style={[
                            styles.dateOptionText,
                            selected && styles.dateOptionTextSelected,
                          ]}
                        >
                          {getPresetLabel(preset)}
                        </Text>

                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={19}
                            color={colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    );
                  },
                )}

                {datePreset === "custom" ? (
                  <View style={styles.customDateSection}>
                    <Text style={styles.customDateLabel}>Start Date</Text>

                    <Pressable
                      style={styles.dateInput}
                      onPress={() => {
                        setShowEndDatePicker(false);
                        setShowStartDatePicker(true);
                      }}
                    >
                      <View style={styles.datePickerField}>
                        <Text style={styles.datePickerValue}>
                          {formatReportDate(customStartDate)}
                        </Text>

                        <Ionicons
                          name="calendar-outline"
                          size={19}
                          color={colors.textSecondary}
                        />
                      </View>
                    </Pressable>

                    {showStartDatePicker ? (
                      <DateTimePicker
                        value={parseReportDate(customStartDate)}
                        mode="date"
                        display="default"
                        maximumDate={parseReportDate(customEndDate)}
                        onValueChange={(event) => {
                          setShowStartDatePicker(false);

                          const selectedDate = new Date(
                            event.nativeEvent.timestamp,
                          );

                          const selectedValue = formatDate(selectedDate);

                          setCustomStartDate(selectedValue);

                          if (selectedValue > customEndDate) {
                            setCustomEndDate(selectedValue);
                          }
                        }}
                        onDismiss={() => {
                          setShowStartDatePicker(false);
                        }}
                      />
                    ) : null}

                    <Text
                      style={[
                        styles.customDateLabel,
                        styles.customDateLabelSecond,
                      ]}
                    >
                      End Date
                    </Text>

                    <Pressable
                      style={styles.dateInput}
                      onPress={() => {
                        setShowStartDatePicker(false);
                        setShowEndDatePicker(true);
                      }}
                    >
                      <View style={styles.datePickerField}>
                        <Text style={styles.datePickerValue}>
                          {formatReportDate(customEndDate)}
                        </Text>

                        <Ionicons
                          name="calendar-outline"
                          size={19}
                          color={colors.textSecondary}
                        />
                      </View>
                    </Pressable>

                    {showEndDatePicker ? (
                      <DateTimePicker
                        value={parseReportDate(customEndDate)}
                        mode="date"
                        display="default"
                        minimumDate={parseReportDate(customStartDate)}
                        onValueChange={(event) => {
                          setShowEndDatePicker(false);

                          const selectedDate = new Date(
                            event.nativeEvent.timestamp,
                          );

                          setCustomEndDate(formatDate(selectedDate));
                        }}
                        onDismiss={() => {
                          setShowEndDatePicker(false);
                        }}
                      />
                    ) : null}

                    <Pressable
                      style={({ pressed }) => [
                        styles.applyDateButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={applyCustomDate}
                    >
                      <Text style={styles.applyDateButtonText}>
                        Apply Date Range
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </AppCard>
            ) : null}
          </View>

          {error && report ? (
            <View style={styles.inlineError}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={colors.danger}
              />

              <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          {report ? (
            <>
              <View
                style={[
                  styles.summaryGrid,
                  isTablet && styles.summaryGridTablet,
                ]}
              >
                <SummaryCard
                  label="Net Sales"
                  value={formatCurrency(report.summary.netSales)}
                  icon="trending-up-outline"
                  tablet={isTablet}
                />

                <SummaryCard
                  label="Collected"
                  value={formatCurrency(report.summary.collected)}
                  icon="cash-outline"
                  tablet={isTablet}
                />

                <SummaryCard
                  label="Outstanding"
                  value={formatCurrency(report.summary.outstanding)}
                  icon="time-outline"
                  tablet={isTablet}
                />

                <SummaryCard
                  label="Job Orders"
                  value={report.summary.jobOrderCount.toLocaleString("en-PH")}
                  icon="receipt-outline"
                  tablet={isTablet}
                />

                <SummaryCard
                  label="Total Expenses"
                  value={formatCurrency(report.summary.totalExpenses)}
                  icon="wallet-outline"
                  tablet={isTablet}
                  expense
                />
              </View>

              <AppCard padding={spacing.lg} style={styles.sectionCard}>
                <SectionHeader
                  icon="bar-chart-outline"
                  title="Sales Breakdown"
                  subtitle="Net sales by item type"
                />

                <BreakdownRow
                  label="Services"
                  value={report.salesBreakdown.services}
                  percentage={getBreakdownWidth(report.salesBreakdown.services)}
                  icon="shirt-outline"
                />

                <BreakdownRow
                  label="Products"
                  value={report.salesBreakdown.products}
                  percentage={getBreakdownWidth(report.salesBreakdown.products)}
                  icon="cube-outline"
                />

                <BreakdownRow
                  label="Bundles"
                  value={report.salesBreakdown.bundles}
                  percentage={getBreakdownWidth(report.salesBreakdown.bundles)}
                  icon="layers-outline"
                />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Net Sales</Text>

                  <Text style={styles.totalValue}>
                    {formatCurrency(report.summary.netSales)}
                  </Text>
                </View>
              </AppCard>

              <AppCard padding={spacing.lg} style={styles.sectionCard}>
                <SectionHeader
                  icon="card-outline"
                  title="Payment Collections"
                  subtitle="Actual payments recorded during the selected period"
                />

                <CollectionRow
                  label="Cash"
                  value={report.paymentCollections.cash}
                  icon="cash-outline"
                />

                <CollectionRow
                  label="GCash"
                  value={report.paymentCollections.gcash}
                  icon="phone-portrait-outline"
                />

                <CollectionRow
                  label="Other"
                  value={report.paymentCollections.other}
                  icon="card-outline"
                />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Collected</Text>

                  <Text style={styles.totalValue}>
                    {formatCurrency(report.summary.collected)}
                  </Text>
                </View>
              </AppCard>

              <AppCard padding={spacing.lg} style={styles.sectionCard}>
                <SectionHeader
                  icon="pricetag-outline"
                  title="Discounts"
                  subtitle="Gross sales before discounts"
                />

                <InfoRow
                  label="Gross Sales"
                  value={formatCurrency(report.summary.grossSales)}
                />

                <InfoRow
                  label="Discounts"
                  value={formatCurrency(report.summary.discounts)}
                />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Net Sales</Text>

                  <Text style={styles.totalValue}>
                    {formatCurrency(report.summary.netSales)}
                  </Text>
                </View>
              </AppCard>

              <AppCard
                padding={spacing.lg}
                style={[styles.sectionCard, styles.expenseSectionCard]}
              >
                <View style={styles.expenseSectionAccent} />

                <View style={styles.expenseSectionContent}>
                  <SectionHeader
                    icon="wallet-outline"
                    title="Expenses"
                    subtitle="Individual expenses recorded during the selected period"
                  />

                  {report.expenses.length === 0 ? (
                    <View style={styles.noExpenseState}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={22}
                        color={colors.textMuted}
                      />

                      <Text style={styles.noExpenseText}>
                        No expenses recorded for this period.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View
                        style={[
                          styles.expenseListHeader,
                          isTablet && styles.expenseListHeaderTablet,
                        ]}
                      >
                        <Text
                          style={[
                            styles.expenseHeaderText,
                            styles.expenseDateColumn,
                          ]}
                        >
                          Date
                        </Text>

                        <Text
                          style={[
                            styles.expenseHeaderText,
                            styles.expenseCategoryColumn,
                          ]}
                        >
                          Category
                        </Text>

                        <Text
                          style={[
                            styles.expenseHeaderText,
                            styles.expenseDescriptionColumn,
                          ]}
                        >
                          Description
                        </Text>

                        <Text
                          style={[
                            styles.expenseHeaderText,
                            styles.expenseAmountColumn,
                          ]}
                        >
                          Amount
                        </Text>
                      </View>

                      {report.expenses.map((expense) => (
                        <ExpenseRow
                          key={expense.id}
                          expense={expense}
                          tablet={isTablet}
                        />
                      ))}

                      <View style={styles.expenseTotalRow}>
                        <Text style={styles.expenseTotalLabel}>
                          Total Expenses
                        </Text>

                        <Text style={styles.expenseTotalValue}>
                          {formatCurrency(report.summary.totalExpenses)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </AppCard>

              <AppCard padding={spacing.lg} style={styles.sectionCard}>
                <SectionHeader
                  icon="calendar-outline"
                  title="Daily Breakdown"
                  subtitle="Gross sales, expenses and net by day"
                />

                <View style={styles.dailyHeader}>
                  <Text
                    style={[styles.dailyHeaderText, styles.dailyDateColumn]}
                  >
                    Date
                  </Text>

                  <Text
                    style={[styles.dailyHeaderText, styles.dailyAmountColumn]}
                  >
                    Gross Sales
                  </Text>

                  <Text
                    style={[styles.dailyHeaderText, styles.dailyAmountColumn]}
                  >
                    Expenses
                  </Text>

                  <Text
                    style={[styles.dailyHeaderText, styles.dailyAmountColumn]}
                  >
                    Net
                  </Text>
                </View>

                {report.dailyBreakdown.map((day) => (
                  <DailyBreakdownRow key={day.date} day={day} />
                ))}
              </AppCard>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tablet,
  expense = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tablet: boolean;
  expense?: boolean;
}) {
  return (
    <AppCard
      padding={spacing.lg}
      style={[
        styles.summaryCard,
        tablet && styles.summaryCardTablet,
        expense && styles.summaryCardExpense,
        expense && !tablet && styles.summaryCardExpenseMobile,
      ]}
    >
      <View style={[styles.summaryIcon, expense && styles.summaryIconExpense]}>
        <Ionicons
          name={icon}
          size={21}
          color={expense ? colors.danger : colors.primary}
        />
      </View>

      <Text style={styles.summaryLabel}>{label}</Text>

      <Text
        style={[styles.summaryValue, expense && styles.summaryValueExpense]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </AppCard>
  );
}

function BreakdownRow({
  label,
  value,
  percentage,
  icon,
}: {
  label: string;
  value: number;
  percentage: DimensionValue;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownHeader}>
        <View style={styles.breakdownLabelWrapper}>
          <Ionicons name={icon} size={19} color={colors.textSecondary} />

          <Text style={styles.breakdownLabel}>{label}</Text>
        </View>

        <Text style={styles.breakdownValue}>{formatCurrency(value)}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: percentage,
            },
          ]}
        />
      </View>
    </View>
  );
}

function CollectionRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.collectionRow}>
      <View style={styles.collectionLabelWrapper}>
        <Ionicons name={icon} size={19} color={colors.textSecondary} />

        <Text style={styles.collectionLabel}>{label}</Text>
      </View>

      <Text style={styles.collectionValue}>{formatCurrency(value)}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ExpenseRow({
  expense,
  tablet,
}: {
  expense: SalesReport["expenses"][number];
  tablet: boolean;
}) {
  if (!tablet) {
    return (
      <View style={styles.expenseRowMobile}>
        <View style={styles.expenseMobileTopRow}>
          <View style={styles.expenseMobileDateWrapper}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={colors.textMuted}
            />

            <Text style={styles.expenseMobileDate}>
              {formatReportDate(expense.expenseDate)}
            </Text>
          </View>

          <Text style={styles.expenseMobileAmount}>
            {formatCurrency(expense.amount)}
          </Text>
        </View>

        <View style={styles.expenseMobileCategoryWrapper}>
          <View style={styles.expenseBullet} />

          <Text style={styles.expenseMobileCategory}>
            {expense.categoryName}
          </Text>
        </View>

        <Text
          style={[
            styles.expenseMobileDescription,
            !expense.description && styles.expenseDescriptionEmpty,
          ]}
          numberOfLines={3}
        >
          {expense.description || "No description"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.expenseRowTablet}>
      <View style={styles.expenseDateColumn}>
        <Text style={styles.expenseDateText}>
          {formatReportDate(expense.expenseDate)}
        </Text>
      </View>

      <View style={styles.expenseCategoryColumn}>
        <View style={styles.expenseCategoryWrapper}>
          <View style={styles.expenseBullet} />

          <Text style={styles.expenseCategoryText}>{expense.categoryName}</Text>
        </View>
      </View>

      <View style={styles.expenseDescriptionColumn}>
        <Text
          style={[
            styles.expenseDescriptionText,
            !expense.description && styles.expenseDescriptionEmpty,
          ]}
          numberOfLines={2}
        >
          {expense.description || "No description"}
        </Text>
      </View>

      <View style={styles.expenseAmountColumn}>
        <Text style={styles.expenseAmountText}>
          {formatCurrency(expense.amount)}
        </Text>
      </View>
    </View>
  );
}

function DailyBreakdownRow({
  day,
}: {
  day: SalesReport["dailyBreakdown"][number];
}) {
  return (
    <View style={styles.dailyRow}>
      <Text style={[styles.dailyDateText, styles.dailyDateColumn]}>
        {formatDailyDate(day.date)}
      </Text>

      <Text style={[styles.dailyValueText, styles.dailyAmountColumn]}>
        {formatCurrency(day.grossSales)}
      </Text>

      <Text style={[styles.dailyExpenseText, styles.dailyAmountColumn]}>
        {formatCurrency(day.expenses)}
      </Text>

      <Text
        style={[
          styles.dailyNetText,
          styles.dailyAmountColumn,
          day.net < 0 && styles.dailyNetNegative,
        ]}
      >
        {formatCurrency(day.net)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  expenseRowMobile: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  expenseMobileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  expenseMobileDateWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },

  expenseMobileDate: {
    ...typography.small,
    color: colors.textSecondary,
  },

  expenseMobileAmount: {
    ...typography.bodyMedium,
    color: colors.danger,
  },

  expenseMobileCategoryWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  expenseMobileCategory: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  expenseMobileDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginLeft: 15,
    marginTop: spacing.xs,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    width: "100%",
    paddingBottom: spacing["4xl"],
  },

  heroWrapper: {
    width: "100%",
  },

  content: {
    alignSelf: "center",
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.xl,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
  },

  dateSection: {
    marginBottom: spacing.lg,
  },

  dateSelector: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dateSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  dateIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  dateSelectorLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  dateSelectorValue: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: 2,
  },

  dateOptionsCard: {
    marginTop: spacing.sm,
  },

  dateOption: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dateOptionSelected: {
    backgroundColor: colors.primaryLight,
  },

  dateOptionText: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  dateOptionTextSelected: {
    color: colors.primary,
  },

  customDateSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },

  customDateLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  customDateLabelSecond: {
    marginTop: spacing.md,
  },

  dateInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },

  datePickerField: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  datePickerValue: {
    ...typography.body,
    color: colors.text,
  },

  applyDateButton: {
    minHeight: 46,
    marginTop: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },

  applyDateButtonText: {
    ...typography.bodyMedium,
    color: colors.white,
  },

  inlineError: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  inlineErrorText: {
    ...typography.small,
    color: colors.danger,
    flex: 1,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  summaryGridTablet: {
    flexWrap: "nowrap",
  },

  summaryCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 140,
  },

  summaryCardTablet: {
    flex: 1,
    width: undefined,
    flexBasis: 0,
  },

  summaryCardExpense: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },

  summaryCardExpenseMobile: {
    width: "100%",
    flexBasis: "100%",
  },

  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },

  summaryIconExpense: {
    backgroundColor: colors.background,
  },

  summaryLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },

  summaryValue: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
  },

  summaryValueExpense: {
    color: colors.danger,
  },

  sectionCard: {
    marginBottom: spacing.lg,
  },

  breakdownRow: {
    marginTop: spacing.md,
  },

  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  breakdownLabelWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  breakdownLabel: {
    ...typography.body,
    color: colors.text,
  },

  breakdownValue: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  progressTrack: {
    height: 7,
    borderRadius: theme.radius.full,
    backgroundColor: colors.background,
    overflow: "hidden",
    marginTop: spacing.sm,
  },

  progressFill: {
    height: "100%",
    borderRadius: theme.radius.full,
    backgroundColor: colors.primary,
  },

  totalRow: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  totalValue: {
    ...typography.bodyMedium,
    color: colors.primary,
  },

  collectionRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  collectionLabelWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  collectionLabel: {
    ...typography.body,
    color: colors.text,
  },

  collectionValue: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  infoRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },

  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },

  infoValue: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  /* ------------------------------------------------------------------------ */
  /* Expenses                                                                 */
  /* ------------------------------------------------------------------------ */

  expenseSectionCard: {
    position: "relative",
    overflow: "hidden",
    paddingLeft: spacing.lg + 3,
  },

  expenseSectionAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.danger,
  },

  expenseSectionContent: {
    flex: 1,
  },

  expenseListHeader: {
    display: "none",
  },

  expenseListHeaderTablet: {
    display: "flex",
    minHeight: 38,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },

  expenseHeaderText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  expenseDateColumn: {
    width: 95,
  },

  expenseCategoryColumn: {
    flex: 1,
    minWidth: 120,
  },

  expenseDescriptionColumn: {
    flex: 1.5,
    minWidth: 140,
  },

  expenseAmountColumn: {
    width: 115,
    alignItems: "flex-end",
  },

  expenseRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "column",
    gap: spacing.xs,
  },

  expenseRowTablet: {
    minHeight: 58,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  expenseDateText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  expenseCategoryWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  expenseBullet: {
    width: 7,
    height: 7,
    borderRadius: theme.radius.full,
    backgroundColor: colors.danger,
  },

  expenseCategoryText: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  expenseDescriptionText: {
    ...typography.small,
    color: colors.textSecondary,
  },

  expenseDescriptionEmpty: {
    color: colors.textMuted,
    fontStyle: "italic",
  },

  expenseAmountText: {
    ...typography.bodyMedium,
    color: colors.danger,
  },

  expenseTotalRow: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  expenseTotalLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  expenseTotalValue: {
    ...typography.bodyMedium,
    color: colors.danger,
  },

  noExpenseState: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  noExpenseText: {
    ...typography.small,
    color: colors.textMuted,
  },

  /* ------------------------------------------------------------------------ */
  /* Daily Breakdown                                                          */
  /* ------------------------------------------------------------------------ */

  dailyHeader: {
    minHeight: 42,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },

  dailyHeaderText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  dailyDateColumn: {
    flex: 1.1,
    minWidth: 70,
  },

  dailyAmountColumn: {
    flex: 1,
    minWidth: 80,
    textAlign: "right",
  },

  dailyRow: {
    minHeight: 50,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },

  dailyDateText: {
    ...typography.small,
    color: colors.text,
  },

  dailyValueText: {
    ...typography.small,
    color: colors.text,
  },

  dailyExpenseText: {
    ...typography.small,
    color: colors.danger,
  },

  dailyNetText: {
    ...typography.small,
    color: colors.text,
  },

  dailyNetNegative: {
    color: colors.danger,
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
  },

  retryText: {
    ...typography.button,
    color: colors.white,
  },

  pressed: {
    opacity: 0.8,
  },
});
