import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/ui/AppCard";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";

export default function MoreScreen() {
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: logout,
        },
      ],
      {
        cancelable: true,
      },
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <PageHero
          icon="settings-outline"
          title="More"
          subtitle="Administration and POS settings"
        />

        <View style={styles.contentInner}>
          <View style={styles.section}>
            <SectionHeader
              icon="grid-outline"
              title="Management"
              subtitle="Manage customers, products, services, inventory and other areas of your POS"
            />

            <View style={styles.menuList}>
              <AppCard
                padding={spacing.md}
                onPress={() => router.push("/customers")}
              >
                <MenuRow
                  icon="people-outline"
                  title="Customers"
                  subtitle="Manage customer records and contact information"
                />
              </AppCard>

              <AppCard
                padding={spacing.md}
                onPress={() => router.push("/products")}
              >
                <MenuRow
                  icon="cube-outline"
                  title="Products"
                  subtitle="Manage products and selling prices"
                />
              </AppCard>

              <AppCard
                padding={spacing.md}
                onPress={() => router.push("/services")}
              >
                <MenuRow
                  icon="shirt-outline"
                  title="Services"
                  subtitle="Manage laundry services and prices"
                />
              </AppCard>

              <AppCard
                padding={spacing.md}
                onPress={() => router.push("/bundles")}
              >
                <MenuRow
                  icon="layers-outline"
                  title="Bundles"
                  subtitle="Manage service and product bundles"
                />
              </AppCard>

              <AppCard
                padding={spacing.md}
                onPress={() => router.push("/inventory")}
              >
                <MenuRow
                  icon="cube-outline"
                  title="Inventory"
                  subtitle="Manage stock levels, stock movements and inventory"
                />
              </AppCard>

              <AppCard
                padding={spacing.md}
                onPress={() => router.push("/expenses")}
              >
                <MenuRow
                  icon="receipt-outline"
                  title="Expenses"
                  subtitle="Track and manage shop expenses"
                />
              </AppCard>

              <AppCard
                padding={spacing.md}
                onPress={() => router.push("/activity-log")}
              >
                <MenuRow
                  icon="time-outline"
                  title="Activity Log"
                  subtitle="Review important activity across your POS"
                />
              </AppCard>

              <AppCard
                padding={spacing.md}
                onPress={() => router.push("/settings")}
              >
                <MenuRow
                  icon="settings-outline"
                  title="Settings"
                  subtitle="Configure shop information and receipt settings"
                />
              </AppCard>
            </View>
          </View>

          {isAdmin ? (
            <View style={styles.section}>
              <SectionHeader
                icon="shield-checkmark-outline"
                title="Administration"
                subtitle="Manage user accounts and access"
              />

              <View style={styles.menuList}>
                <AppCard
                  padding={spacing.md}
                  onPress={() => router.push("/users")}
                >
                  <MenuRow
                    icon="people-outline"
                    title="User Management"
                    subtitle="Manage staff accounts, roles, passwords and access"
                  />
                </AppCard>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              icon="person-circle-outline"
              title="Account"
              subtitle="Your current account and session"
            />

            <View style={styles.menuList}>
              <AppCard padding={spacing.md}>
                <View style={styles.accountRow}>
                  <View style={styles.accountIcon}>
                    <Ionicons
                      name="person-outline"
                      size={24}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.accountContent}>
                    <Text style={styles.accountName}>
                      {user?.fullName ?? "Unknown User"}
                    </Text>

                    <Text style={styles.accountUsername}>
                      @{user?.username ?? ""}
                    </Text>

                    <View style={styles.roleRow}>
                      <Ionicons
                        name={
                          user?.role === "admin"
                            ? "shield-checkmark-outline"
                            : "person-outline"
                        }
                        size={14}
                        color={colors.textSecondary}
                      />

                      <Text style={styles.roleText}>
                        {user?.role === "admin" ? "Administrator" : "Staff"}
                      </Text>
                    </View>
                  </View>
                </View>
              </AppCard>

              <AppCard padding={spacing.md} onPress={handleLogout}>
                <MenuRow
                  icon="log-out-outline"
                  title="Log Out"
                  subtitle="End your current POS session"
                  danger
                />
              </AppCard>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type MenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  danger?: boolean;
};

function MenuRow({ icon, title, subtitle, danger = false }: MenuRowProps) {
  const iconColor = danger ? colors.danger : colors.primary;

  return (
    <View style={styles.menuRow}>
      <View style={[styles.menuIcon, danger ? styles.menuIconDanger : null]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>

      <View style={styles.menuContent}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.menuTitle, danger ? styles.menuTitleDanger : null]}
          >
            {title}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={danger ? colors.danger : colors.textMuted}
          />
        </View>

        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
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
  },

  section: {
    marginTop: spacing["2xl"],
  },

  menuList: {
    marginTop: spacing.md,
    gap: spacing.md,
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  menuIconDanger: {
    backgroundColor: colors.dangerLight,
  },

  menuContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 1,
  },

  menuTitleDanger: {
    color: colors.danger,
  },

  menuSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 4,
    paddingRight: spacing.lg,
  },

  accountRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  accountContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  accountName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  accountUsername: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 5,
  },

  roleText: {
    ...typography.small,
    color: colors.textSecondary,
  },
});
