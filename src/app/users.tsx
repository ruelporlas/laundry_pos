import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import type { User } from "@/models/user";
import {
  activateUser,
  deactivateUser,
  getUsers,
} from "@/repositories/userRepository";

export default function UsersScreen() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setError(null);

      const result = await getUsers();

      setUsers(result);
    } catch (loadError) {
      console.error("Failed to load users:", loadError);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load users.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers]),
  );

  function handleRefresh() {
    setRefreshing(true);
    loadUsers();
  }

  function handleToggleUser(user: User) {
    const action = user.isActive ? "Deactivate" : "Activate";

    Alert.alert(
      `${action} User`,
      `Are you sure you want to ${action.toLowerCase()} ${user.fullName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: action,
          style: user.isActive ? "destructive" : "default",
          onPress: async () => {
            try {
              if (user.isActive) {
                await deactivateUser(user.id);
              } else {
                await activateUser(user.id);
              }

              await loadUsers();
            } catch (toggleError) {
              console.error("Failed to update user status:", toggleError);

              Alert.alert(
                "Unable to Update User",
                toggleError instanceof Error
                  ? toggleError.message
                  : "Something went wrong.",
              );
            }
          },
        },
      ],
    );
  }

  function handleUserPress(user: User) {
    router.push({
      pathname: "/user-details",
      params: {
        id: String(user.id),
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="people-circle-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Users</Text>
            <Text style={styles.heroSubtitle}>
              Manage staff accounts and administrator access
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          onPress={() => router.push("/add-user")}
        >
          <Ionicons name="add" size={21} color={colors.white} />

          <Text style={styles.addButtonText}>Add User</Text>
        </Pressable>

        {error ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="warning-outline"
                size={24}
                color={colors.danger}
              />
            </View>

            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Unable to load users</Text>

              <Text style={styles.errorMessage}>{error}</Text>

              <Pressable onPress={loadUsers}>
                <Text style={styles.retryText}>Try Again</Text>
              </Pressable>
            </View>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="person-add-outline"
                size={28}
                color={colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>No users yet</Text>

            <Text style={styles.emptyMessage}>
              Create the first user account to start managing access to the POS.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/add-user")}
            >
              <Text style={styles.emptyButtonText}>Create User</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {users.map((user) => (
              <Pressable
                key={user.id}
                style={({ pressed }) => [
                  styles.userCard,
                  pressed && styles.userCardPressed,
                ]}
                onPress={() => handleUserPress(user)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(user.fullName)}
                  </Text>
                </View>

                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.fullName}
                  </Text>

                  <Text style={styles.username} numberOfLines={1}>
                    @{user.username}
                  </Text>

                  <View style={styles.metaRow}>
                    <View
                      style={[
                        styles.roleBadge,
                        user.role === "admin"
                          ? styles.adminBadge
                          : styles.staffBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          user.role === "admin"
                            ? styles.adminText
                            : styles.staffText,
                        ]}
                      >
                        {user.role === "admin" ? "Administrator" : "Staff"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        user.isActive
                          ? styles.activeBadge
                          : styles.inactiveBadge,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          user.isActive ? styles.activeDot : styles.inactiveDot,
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusText,
                          user.isActive
                            ? styles.activeText
                            : styles.inactiveText,
                        ]}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <Pressable
                    hitSlop={10}
                    onPress={(event) => {
                      event.stopPropagation();
                      handleToggleUser(user);
                    }}
                  >
                    <Ionicons
                      name={
                        user.isActive
                          ? "pause-circle-outline"
                          : "play-circle-outline"
                      }
                      size={25}
                      color={user.isActive ? colors.warning : colors.success}
                    />
                  </Pressable>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textMuted}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingBottom: spacing["3xl"],
  },

  hero: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 54,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    alignItems: "center",
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  heroText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  heroTitle: {
    ...typography.h2,
    color: colors.text,
  },

  heroSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  addButton: {
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.lg,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  addButtonText: {
    ...typography.button,
    color: colors.white,
  },

  list: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },

  userCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },

  userCardPressed: {
    opacity: 0.75,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryDark,
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.md,
  },

  userName: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  username: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },

  adminBadge: {
    backgroundColor: colors.primaryLight,
  },

  staffBadge: {
    backgroundColor: colors.surfaceSoft,
  },

  roleText: {
    ...typography.caption,
  },

  adminText: {
    color: colors.primaryDark,
  },

  staffText: {
    color: colors.textSecondary,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 5,
  },

  activeBadge: {
    backgroundColor: colors.successLight,
  },

  inactiveBadge: {
    backgroundColor: colors.dangerLight,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  activeDot: {
    backgroundColor: colors.success,
  },

  inactiveDot: {
    backgroundColor: colors.danger,
  },

  statusText: {
    ...typography.caption,
  },

  activeText: {
    color: colors.success,
  },

  inactiveText: {
    color: colors.danger,
  },

  cardActions: {
    marginLeft: spacing.sm,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  errorCard: {
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dangerLight,
    backgroundColor: colors.surface,
    flexDirection: "row",
  },

  errorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  errorContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  errorTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  errorMessage: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 3,
  },

  retryText: {
    ...typography.button,
    color: colors.primary,
    marginTop: spacing.sm,
  },

  emptyCard: {
    marginHorizontal: PAGE_PADDING,
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },

  emptyMessage: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  emptyButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyButtonText: {
    ...typography.button,
    color: colors.white,
  },

  pressed: {
    opacity: 0.8,
  },
});
