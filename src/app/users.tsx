import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { User } from "@/models/user";
import {
  activateUser,
  deactivateUser,
  getUsers,
} from "@/repositories/userRepository";

const MAX_CONTENT_WIDTH = 720;

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
    return <LoadingState message="Loading users..." />;
  }

  return (
    <View style={styles.screen}>
      <PageHero
        icon="people-circle-outline"
        title="Users"
        subtitle="Manage staff accounts and administrator access"
      />

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
        <View style={styles.contentInner}>
          <AppButton
            title="Add User"
            icon="add"
            fullWidth
            onPress={() => router.push("/add-user")}
          />

          {error ? (
            <View style={styles.errorSection}>
              <ErrorState title="Unable to load users" message={error} />

              <View style={styles.retryAction}>
                <AppButton
                  title="Try Again"
                  icon="refresh-outline"
                  variant="secondary"
                  onPress={loadUsers}
                />
              </View>
            </View>
          ) : users.length === 0 ? (
            <View style={styles.emptySection}>
              <EmptyState
                icon="person-add-outline"
                title="No users yet"
                message="Create the first user account to start managing access to the POS."
              />

              <View style={styles.emptyAction}>
                <AppButton
                  title="Create User"
                  icon="add"
                  onPress={() => router.push("/add-user")}
                />
              </View>
            </View>
          ) : (
            <View style={styles.list}>
              {users.map((user) => (
                <AppCard
                  key={user.id}
                  padding={spacing.md}
                  onPress={() => handleUserPress(user)}
                  style={styles.userCard}
                >
                  <View style={styles.userCardContent}>
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
                        <StatusBadge
                          label={
                            user.role === "admin" ? "Administrator" : "Staff"
                          }
                          variant={
                            user.role === "admin" ? "primary" : "neutral"
                          }
                        />

                        <StatusBadge
                          label={user.isActive ? "Active" : "Inactive"}
                          variant={user.isActive ? "success" : "danger"}
                        />
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <Pressable
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={
                          user.isActive
                            ? `Deactivate ${user.fullName}`
                            : `Activate ${user.fullName}`
                        }
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
                          color={
                            user.isActive ? colors.warning : colors.success
                          }
                        />
                      </Pressable>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={colors.textMuted}
                      />
                    </View>
                  </View>
                </AppCard>
              ))}
            </View>
          )}
        </View>
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
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.lg,
    paddingBottom: spacing["4xl"],
  },

  contentInner: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },

  errorSection: {
    marginTop: spacing.lg,
    alignItems: "center",
  },

  retryAction: {
    marginTop: spacing.sm,
  },

  emptySection: {
    marginTop: spacing.lg,
    alignItems: "center",
  },

  emptyAction: {
    marginTop: spacing.sm,
  },

  list: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },

  userCard: {
    borderWidth: 1,
    borderColor: colors.border,
  },

  userCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    ...typography.bodyMedium,
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

  cardActions: {
    marginLeft: spacing.sm,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
