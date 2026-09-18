import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";
import type { Service } from "@/models/service";
import { getServices } from "@/repositories/serviceRepository";

const GRID_GAP = 16;
const PAGE_PADDING = 16;
const MAX_CONTENT_WIDTH = 1200;

export default function ServicesScreen() {
  const { width } = useWindowDimensions();

  const numColumns = width >= 1200 ? 4 : width >= 768 ? 3 : 2;

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  const availableWidth = contentWidth - PAGE_PADDING * 2;

  const cardWidth = (availableWidth - GRID_GAP * (numColumns - 1)) / numColumns;

  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    try {
      setError(null);

      const result = await getServices();

      setServices(result);
    } catch (error) {
      console.error("Failed to load services:", error);

      setError(
        error instanceof Error ? error.message : "Unable to load services.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, [loadServices]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      setError(null);

      const result = await getServices();

      setServices(result);
    } catch (error) {
      console.error("Failed to refresh services:", error);

      setError(
        error instanceof Error ? error.message : "Unable to refresh services.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return services;
    }

    return services.filter((service) => {
      return (
        service.name.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query)
      );
    });
  }, [services, search]);

  const renderService = useCallback(
    ({ item }: { item: Service }) => (
      <AppCard
        onPress={() =>
          router.push({
            pathname: "/service-details",
            params: {
              id: item.id.toString(),
            },
          })
        }
        style={[
          styles.serviceCard,
          {
            width: cardWidth,
          },
        ]}
      >
        <View style={styles.serviceTop}>
          <View style={styles.serviceIcon}>
            <Ionicons
              name="construct-outline"
              size={22}
              color={colors.primary}
            />
          </View>

          <StatusBadge
            label={item.isActive ? "Active" : "Inactive"}
            variant={item.isActive ? "success" : "neutral"}
          />
        </View>

        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {item.name}
          </Text>

          <Text style={styles.description} numberOfLines={2}>
            {item.description || "No description"}
          </Text>
        </View>

        <View style={styles.serviceBottom}>
          <Text style={styles.price}>₱{item.price.toFixed(2)}</Text>

          <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
        </View>
      </AppCard>
    ),
    [cardWidth],
  );

  const renderListHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.headerHero}>
        <View style={styles.heroIcon}>
          <Ionicons name="construct-outline" size={30} color={colors.primary} />
        </View>

        <Text style={styles.title}>Services</Text>

        <Text style={styles.subtitle}>Manage your laundry services</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <View style={styles.searchIconContainer}>
            <Ionicons
              name="search-outline"
              size={19}
              color={colors.textMuted}
            />
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search services..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />

          {search.length > 0 && (
            <View style={styles.resultCount}>
              <Text style={styles.resultCountText}>
                {filteredServices.length}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <View style={styles.sectionInfo}>
            <Text style={styles.sectionTitle}>Your services</Text>

            <Text style={styles.sectionSubtitle}>
              {filteredServices.length}{" "}
              {filteredServices.length === 1 ? "service" : "services"}
            </Text>
          </View>

          <AppButton
            title="Add Service"
            icon="add"
            onPress={() => router.push("/add-service")}
          />
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      </View>
    );
  }

  if (error && services.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.errorScreen}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={colors.danger}
            />
          </View>

          <Text style={styles.errorTitle}>Unable to load services</Text>

          <Text style={styles.errorMessage}>{error}</Text>

          <Pressable
            onPress={loadServices}
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
      <View style={styles.content}>
        <FlatList
          key={`services-grid-${numColumns}`}
          data={filteredServices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderService}
          numColumns={numColumns}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <EmptyState
              icon="construct-outline"
              title={search.trim() ? "No services found" : "No services yet"}
              message={
                search.trim()
                  ? "Try searching with a different service name or description."
                  : "Add your first service to get started."
              }
            />
          }
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />

        {error && services.length > 0 && (
          <View style={styles.refreshError}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />

            <Text style={styles.refreshErrorText}>{error}</Text>

            <Pressable
              onPress={loadServices}
              accessibilityRole="button"
              accessibilityLabel="Retry loading services"
            >
              <Text style={styles.refreshErrorAction}>Retry</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
    paddingHorizontal: PAGE_PADDING,
  },

  headerContent: {
    width: "100%",
    paddingBottom: spacing.lg,
  },

  headerHero: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 54,
    paddingBottom: 20,
    marginHorizontal: -PAGE_PADDING,
    paddingHorizontal: spacing["2xl"],
    borderBottomLeftRadius: theme.radius["2xl"],
    borderBottomRightRadius: theme.radius["2xl"],
    backgroundColor: colors.primaryLight,
  },

  heroIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
  },

  title: {
    marginTop: spacing.md,
    ...typography.h2,
    color: colors.text,
    textAlign: "center",
  },

  subtitle: {
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
  },

  controls: {
    paddingTop: spacing.xl,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: colors.surface,
  },

  searchIconContainer: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.background,
  },

  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    paddingVertical: 0,
    ...typography.body,
    color: colors.text,
  },

  resultCount: {
    minWidth: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
  },

  resultCountText: {
    ...typography.caption,
    color: colors.primary,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  sectionInfo: {
    flex: 1,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionSubtitle: {
    marginTop: 2,
    ...typography.small,
    color: colors.textMuted,
  },

  list: {
    paddingBottom: spacing["4xl"],
  },

  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: GRID_GAP,
  },

  serviceCard: {
    aspectRatio: 1,
    padding: spacing.md,
  },

  serviceTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  serviceIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  serviceInfo: {
    flex: 1,
    justifyContent: "center",
    minHeight: 0,
    marginTop: spacing.sm,
  },

  serviceName: {
    ...typography.h3,
    color: colors.text,
  },

  description: {
    marginTop: spacing.xs,
    ...typography.small,
    color: colors.textMuted,
  },

  serviceBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },

  price: {
    ...typography.h3,
    color: colors.text,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
  },

  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textMuted,
  },

  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },

  errorIcon: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: colors.dangerLight,
  },

  errorTitle: {
    marginTop: spacing.lg,
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
  },

  errorMessage: {
    maxWidth: 420,
    marginTop: spacing.xs,
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },

  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 44,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primary,
  },

  retryText: {
    ...typography.button,
    color: colors.white,
  },

  pressed: {
    opacity: 0.8,
  },

  refreshError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: colors.warningLight,
  },

  refreshErrorText: {
    flex: 1,
    ...typography.caption,
    color: colors.warning,
  },

  refreshErrorAction: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
});
