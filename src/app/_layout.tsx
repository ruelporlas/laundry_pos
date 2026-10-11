import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import { Tabs, usePathname, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { checkDatabase, runMigrations } from "@/database";
import { seedDemoData } from "@/database/seedDemoData";
import { registerActions } from "@/hooks/registerActions";

import LoginScreen from "./login";

const TABLET_BREAKPOINT = 768;
const SIDEBAR_EXPANDED_WIDTH = 200;
const SIDEBAR_COLLAPSED_WIDTH = 72;

const ADMIN_ONLY_ROUTES = new Set([
  "/users",
  "/add-user",
  "/user-details",
  "/edit-user",
]);

async function configureOrientationForDevice(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const deviceType = await Device.getDeviceTypeAsync();

    if (deviceType === Device.DeviceType.TABLET) {
      await ScreenOrientation.unlockAsync();
    } else {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    }
  } catch (error) {
    console.warn("Unable to configure screen orientation:", error);
  }
}

export default function RootLayout() {
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<Error | null>(null);

  useEffect(() => {
    void configureOrientationForDevice();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeDatabase() {
      try {
        await runMigrations();

        const isHealthy = await checkDatabase();

        if (!isHealthy) {
          throw new Error(
            "Database health check failed. The expected database version or required tables were not found.",
          );
        }

        await seedDemoData();

        console.log(
          "Database OK — migrations, health check, and demo data seeding completed.",
        );

        registerActions();

        if (mounted) setDatabaseReady(true);
      } catch (error) {
        console.error("Database initialization failed:", error);

        if (mounted) {
          setDatabaseError(
            error instanceof Error
              ? error
              : new Error("Unknown database error"),
          );
        }
      }
    }

    void initializeDatabase();

    return () => {
      mounted = false;
    };
  }, []);

  if (databaseError) {
    return (
      <View style={styles.errorContainer}>
        <ScrollView
          contentContainerStyle={styles.errorContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.errorIcon}>
            <Ionicons name="warning-outline" size={32} color={colors.danger} />
          </View>

          <Text style={styles.errorTitle}>Database Initialization Failed</Text>

          <Text style={styles.errorSubtitle}>
            The app could not initialize the local database.
          </Text>

          <View style={styles.errorCard}>
            <Text style={styles.errorLabel}>Error Details</Text>
            <Text selectable style={styles.errorMessage}>
              {databaseError.message}
            </Text>
          </View>

          <Text style={styles.errorHint}>
            Please send this error message so we can fix the database
            initialization or migration.
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (!databaseReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isTabletLayout = width >= TABLET_BREAKPOINT;
  const sidebarWidth = sidebarCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH
    : SIDEBAR_EXPANDED_WIDTH;

  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const isAdminOnlyRoute = ADMIN_ONLY_ROUTES.has(normalizedPathname);

  const tabletTabBarStyle = {
    width: sidebarWidth,
    paddingTop: 48,
    backgroundColor: colors.surface,
    borderRightColor: colors.border,
    borderRightWidth: 1,
  } as const;

  const hiddenRouteOptions = {
    href: null,
    tabBarStyle: isTabletLayout
      ? tabletTabBarStyle
      : { display: "none" as const },
  };

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (isAdminOnlyRoute && !isAdmin) {
    return <AccessDeniedScreen onReturn={() => router.replace("/")} />;
  }

  return (
    <View style={styles.appContainer}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarPosition: isTabletLayout ? "left" : "bottom",
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,

          // Only hide labels when the tablet sidebar is collapsed.
          // Phone navigation keeps its labels.
          tabBarShowLabel: !isTabletLayout || !sidebarCollapsed,

          tabBarStyle: isTabletLayout
            ? tabletTabBarStyle
            : {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                borderTopWidth: 1,
                height: 60 + insets.bottom,
                paddingTop: spacing.xs,
                paddingBottom: insets.bottom + spacing.xs,
              },

          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
          },

          tabBarItemStyle: {
            paddingVertical: spacing.xs,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="sales-report"
          options={{
            title: "Reports",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="ellipsis-horizontal-circle-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen name="products" options={hiddenRouteOptions} />
        <Tabs.Screen name="services" options={hiddenRouteOptions} />
        <Tabs.Screen name="bundles" options={hiddenRouteOptions} />
        <Tabs.Screen name="activity-log" options={hiddenRouteOptions} />
        <Tabs.Screen name="customers" options={hiddenRouteOptions} />
        <Tabs.Screen name="settings" options={hiddenRouteOptions} />

        <Tabs.Screen name="add-customer" options={hiddenRouteOptions} />
        <Tabs.Screen name="customer-details" options={hiddenRouteOptions} />
        <Tabs.Screen name="edit-customer" options={hiddenRouteOptions} />

        <Tabs.Screen name="add-product" options={hiddenRouteOptions} />
        <Tabs.Screen name="product-details" options={hiddenRouteOptions} />
        <Tabs.Screen name="edit-product" options={hiddenRouteOptions} />

        <Tabs.Screen name="add-service" options={hiddenRouteOptions} />
        <Tabs.Screen name="service-details" options={hiddenRouteOptions} />
        <Tabs.Screen name="edit-service" options={hiddenRouteOptions} />

        <Tabs.Screen name="add-bundle" options={hiddenRouteOptions} />
        <Tabs.Screen name="bundle-details" options={hiddenRouteOptions} />
        <Tabs.Screen name="edit-bundle" options={hiddenRouteOptions} />

        <Tabs.Screen name="new-job-order" options={hiddenRouteOptions} />
        <Tabs.Screen name="payment" options={hiddenRouteOptions} />
        <Tabs.Screen name="job-order-created" options={hiddenRouteOptions} />

        <Tabs.Screen name="users" options={hiddenRouteOptions} />
        <Tabs.Screen name="user-details" options={hiddenRouteOptions} />
        <Tabs.Screen name="add-user" options={hiddenRouteOptions} />
        <Tabs.Screen name="edit-user" options={hiddenRouteOptions} />

        <Tabs.Screen name="expenses" options={hiddenRouteOptions} />
        <Tabs.Screen name="add-expense" options={hiddenRouteOptions} />
        <Tabs.Screen name="expense-details" options={hiddenRouteOptions} />
        <Tabs.Screen name="edit-expense" options={hiddenRouteOptions} />

        <Tabs.Screen name="inventory" options={hiddenRouteOptions} />
        <Tabs.Screen name="inventory-dashboard" options={hiddenRouteOptions} />
        <Tabs.Screen name="inventory-history" options={hiddenRouteOptions} />
        <Tabs.Screen name="stock-in" options={hiddenRouteOptions} />
        <Tabs.Screen name="stock-out" options={hiddenRouteOptions} />
        <Tabs.Screen name="stock-adjustment" options={hiddenRouteOptions} />
        <Tabs.Screen name="inventory-settings" options={hiddenRouteOptions} />

        <Tabs.Screen name="login" options={hiddenRouteOptions} />
      </Tabs>

      {isTabletLayout && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          accessibilityHint="Toggles the sidebar between icons only and icons with labels."
          onPress={() => setSidebarCollapsed((collapsed) => !collapsed)}
          style={({ pressed }) => [
            styles.sidebarToggle,
            {
              left: sidebarCollapsed ? 20 : SIDEBAR_EXPANDED_WIDTH - 44,
            },
            pressed && styles.sidebarTogglePressed,
          ]}
        >
          <Ionicons
            name={sidebarCollapsed ? "chevron-forward" : "chevron-back"}
            size={20}
            color={colors.text}
          />
        </Pressable>
      )}
    </View>
  );
}

function AccessDeniedScreen({ onReturn }: { onReturn: () => void }) {
  return (
    <View style={styles.accessDeniedContainer}>
      <View style={styles.accessDeniedIcon}>
        <Ionicons
          name="shield-checkmark-outline"
          size={36}
          color={colors.danger}
        />
      </View>

      <Text style={styles.accessDeniedTitle}>Access Denied</Text>

      <Text style={styles.accessDeniedMessage}>
        You do not have permission to manage user accounts. Please contact an
        administrator if you need access.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onReturn}
        style={({ pressed }) => [
          styles.accessDeniedButton,
          pressed && styles.accessDeniedButtonPressed,
        ]}
      >
        <Text style={styles.accessDeniedButtonText}>Return to Dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },

  sidebarToggle: {
    position: "absolute",
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 100,
    elevation: 8,
  },

  sidebarTogglePressed: {
    opacity: 0.65,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing["2xl"],
  },

  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  errorContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
  },

  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerLight,
  },

  errorTitle: {
    marginTop: spacing.lg,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },

  errorSubtitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },

  errorCard: {
    width: "100%",
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  errorLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  errorMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.danger,
  },

  errorHint: {
    marginTop: spacing.lg,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: "center",
  },

  accessDeniedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
    backgroundColor: colors.background,
  },

  accessDeniedIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerLight,
  },

  accessDeniedTitle: {
    marginTop: spacing.xl,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },

  accessDeniedMessage: {
    maxWidth: 420,
    marginTop: spacing.md,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
    textAlign: "center",
  },

  accessDeniedButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing["2xl"],
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },

  accessDeniedButtonPressed: {
    opacity: 0.75,
  },

  accessDeniedButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.white,
  },
});
