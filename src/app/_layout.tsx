import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { checkDatabase, runMigrations } from "@/database";
import { registerActions } from "@/hooks/registerActions";

import LoginScreen from "./login";

const ADMIN_ONLY_ROUTES = new Set([
  "/users",
  "/add-user",
  "/user-details",
  "/edit-user",
]);

export default function RootLayout() {
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<Error | null>(null);

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

        console.log(
          "Database OK — version 15 — customers, products, services, bundles, bundle items, Job Orders, payments, users, expenses, audit logs, inventory, app settings, and promotion cache tables exist",
        );

        registerActions();

        if (mounted) {
          setDatabaseReady(true);
        }
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

    initializeDatabase();

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
            Please send this error message so we can fix the database migration.
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

  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const isAdminOnlyRoute = ADMIN_ONLY_ROUTES.has(normalizedPathname);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (isAdminOnlyRoute && !isAdmin) {
    return <AccessDeniedScreen onReturn={() => router.replace("/")} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,

        tabBarStyle: {
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
      {/* MAIN BOTTOM TABS */}

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

      {/* HIDDEN MANAGEMENT ROUTES */}

      <Tabs.Screen
        name="products"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="services"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="bundles"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="activity-log"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="customers"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* CUSTOMER ROUTES */}

      <Tabs.Screen
        name="add-customer"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="customer-details"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="edit-customer"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* PRODUCT ROUTES */}

      <Tabs.Screen
        name="add-product"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="product-details"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="edit-product"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* SERVICE ROUTES */}

      <Tabs.Screen
        name="add-service"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="service-details"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="edit-service"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* BUNDLE ROUTES */}

      <Tabs.Screen
        name="add-bundle"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="bundle-details"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="edit-bundle"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* JOB ORDER ROUTES */}

      <Tabs.Screen
        name="new-job-order"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="payment"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="job-order-created"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* USER MANAGEMENT ROUTES */}

      <Tabs.Screen
        name="users"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="user-details"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="add-user"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="edit-user"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* EXPENSE ROUTES */}

      <Tabs.Screen
        name="expenses"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="add-expense"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="expense-details"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="edit-expense"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* INVENTORY ROUTES */}

      <Tabs.Screen
        name="inventory"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="inventory-dashboard"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="inventory-history"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="stock-in"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="stock-out"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="stock-adjustment"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tabs.Screen
        name="inventory-settings"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* DEVELOPMENT / AUTH ROUTES */}

      <Tabs.Screen
        name="login"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
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
