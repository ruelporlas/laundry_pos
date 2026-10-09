import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { User } from "@/models/user";
import {
  activateUser,
  deactivateUser,
  getUserById,
} from "@/repositories/userRepository";

const MAX_CONTENT_WIDTH = 720;

export default function UserDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = Number(params.id);

  const loadUser = useCallback(async () => {
    if (!Number.isInteger(userId) || userId <= 0) {
      setError("The selected user could not be identified.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);

      const result = await getUserById(userId);

      if (!result) {
        setUser(null);
        setError("This user could not be found.");
        return;
      }

      setUser(result);
    } catch (loadError) {
      console.error("Failed to load user:", loadError);

      setError(
        loadError instanceof Error ? loadError.message : "Unable to load user.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  function handleRefresh() {
    setRefreshing(true);
    loadUser();
  }

  function handleToggleUser() {
    if (!user) {
      return;
    }

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

              await loadUser();
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

  if (loading) {
    return <LoadingState message="Loading user..." />;
  }

  if (error || !user) {
    return (
      <View style={styles.screen}>
        <PageHero
          icon="person-circle-outline"
          title="User Details"
          subtitle="View account information"
          onBack={() => router.push("/users")}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.errorContent}
        >
          <View style={styles.contentInner}>
            <ErrorState
              title="Unable to load user"
              message={error ?? "This user could not be found."}
            />

            <View style={styles.errorAction}>
              <AppButton
                title="Try Again"
                icon="refresh-outline"
                variant="secondary"
                onPress={loadUser}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PageHero
        icon="person-circle-outline"
        title="User Details"
        subtitle="View account information"
        onBack={() => router.push("/users")}
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
          <AppCard padding={spacing.xl}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(user.fullName)}
                </Text>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.name}>{user.fullName}</Text>

                <Text style={styles.username}>@{user.username}</Text>

                <View style={styles.badges}>
                  <StatusBadge
                    label={user.role === "admin" ? "Administrator" : "Staff"}
                    variant={user.role === "admin" ? "primary" : "neutral"}
                  />

                  <StatusBadge
                    label={user.isActive ? "Active" : "Inactive"}
                    variant={user.isActive ? "success" : "danger"}
                  />
                </View>
              </View>
            </View>
          </AppCard>

          <View style={styles.section}>
            <SectionHeader
              icon="information-circle-outline"
              title="Account Information"
              subtitle="Basic details for this POS account"
            />

            <AppCard padding={spacing.lg}>
              <InfoRow
                icon="person-outline"
                label="Full Name"
                value={user.fullName}
              />

              <InfoRow
                icon="at-outline"
                label="Username"
                value={`@${user.username}`}
              />

              <InfoRow
                icon="shield-checkmark-outline"
                label="Role"
                value={user.role === "admin" ? "Administrator" : "Staff"}
              />

              <InfoRow
                icon="checkmark-circle-outline"
                label="Account Status"
                value={user.isActive ? "Active" : "Inactive"}
                last
              />
            </AppCard>
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon="settings-outline"
              title="Account Actions"
              subtitle="Manage this POS account"
            />

            <AppCard padding={spacing.lg}>
              <View style={styles.actionButtons}>
                <AppButton
                  title="Edit User"
                  icon="create-outline"
                  fullWidth
                  onPress={() =>
                    router.push({
                      pathname: "/edit-user",
                      params: {
                        id: String(user.id),
                      },
                    })
                  }
                />

                <AppButton
                  title={user.isActive ? "Deactivate User" : "Activate User"}
                  icon={
                    user.isActive
                      ? "pause-circle-outline"
                      : "play-circle-outline"
                  }
                  variant={user.isActive ? "danger" : "secondary"}
                  fullWidth
                  onPress={handleToggleUser}
                />
              </View>
            </AppCard>
          </View>

          <View style={styles.note}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textMuted}
            />

            <Text style={styles.noteText}>
              User accounts are deactivated instead of permanently deleted so
              historical transactions can remain associated with the user who
              performed them.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
};

function InfoRow({ icon, label, value, last = false }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>

      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
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

  errorContent: {
    padding: spacing.lg,
    paddingBottom: spacing["4xl"],
    flexGrow: 1,
  },

  contentInner: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },

  errorAction: {
    alignItems: "center",
    marginTop: spacing.sm,
  },

  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: colors.primaryDark,
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.lg,
  },

  name: {
    ...typography.h2,
    color: colors.text,
  },

  username: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 2,
  },

  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  section: {
    marginTop: spacing["2xl"],
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  infoIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
  },

  infoText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  infoValue: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: 2,
  },

  actionButtons: {
    gap: spacing.sm,
  },

  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },

  noteText: {
    ...typography.small,
    flex: 1,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
});
