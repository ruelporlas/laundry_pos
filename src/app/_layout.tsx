import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { checkDatabase, runMigrations } from "@/database";

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
          "Database OK — version 7 — customers, products, services, bundles, bundle items, Job Orders, and payments tables exist",
        );

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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "POS",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
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
        name="customers"
        options={{
          title: "Customers",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="services"
        options={{
          title: "Services",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="bundles"
        options={{
          title: "Bundles",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift-outline" size={size} color={color} />
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

      <Tabs.Screen
        name="add-customer"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="customer-details"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="edit-customer"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="add-product"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="product-details"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="edit-product"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="add-service"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="service-details"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="edit-service"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="add-bundle"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="bundle-details"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="edit-bundle"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="new-job-order"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          href: null,
        }}
      />
    </Tabs>
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
});
