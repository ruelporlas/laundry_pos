import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHero } from "@/components/ui/PageHero";
import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { User, UserRole } from "@/models/user";
import {
  getUserById,
  updateUser,
  updateUserPassword,
} from "@/repositories/userRepository";
import { hashPassword } from "@/utils/password";

export default function EditUserScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const [user, setUser] = useState<User | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("staff");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = Number(params.id);

  const loadUser = useCallback(async () => {
    if (!Number.isInteger(userId) || userId <= 0) {
      setError("The selected user could not be identified.");
      setLoading(false);
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
      setFullName(result.fullName);
      setUsername(result.username);
      setRole(result.role);
    } catch (loadError) {
      console.error("Failed to load user:", loadError);

      setError(
        loadError instanceof Error ? loadError.message : "Unable to load user.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser]),
  );

  async function handleSave() {
    if (saving || !user) {
      return;
    }

    setError(null);

    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();

    if (!trimmedName) {
      setError("Full name is required.");
      return;
    }

    if (!trimmedUsername) {
      setError("Username is required.");
      return;
    }

    const changingPassword = password.length > 0 || confirmPassword.length > 0;

    if (changingPassword) {
      if (!password) {
        setError("Please enter a new password.");
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    try {
      setSaving(true);

      await updateUser(user.id, {
        fullName: trimmedName,
        username: trimmedUsername,
        role,
      });

      if (changingPassword) {
        const passwordHash = await hashPassword(password);

        // updateUserPassword expects the password hash directly.
        await updateUserPassword(user.id, passwordHash);
      }

      router.replace({
        pathname: "/user-details",
        params: {
          id: String(user.id),
        },
      });
    } catch (saveError) {
      console.error("Failed to update user:", saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update the user.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading user..." />;
  }

  if (error && !user) {
    return (
      <View style={styles.screen}>
        <PageHero
          icon="create-outline"
          title="Edit User"
          subtitle="Update account information"
          onBack={() => router.replace("/users")}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.errorContent}
        >
          <View style={styles.contentInner}>
            <ErrorState title="Unable to load user" message={error} />

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

  if (!user) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <PageHero
          icon="create-outline"
          title="Edit User"
          subtitle="Update account information"
          onBack={() =>
            router.replace({
              pathname: "/user-details",
              params: {
                id: String(user.id),
              },
            })
          }
          disabled={saving}
        />

        <View style={styles.contentInner}>
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons
                name="warning-outline"
                size={20}
                color={colors.danger}
              />

              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textMuted}
                />

                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="words"
                  editable={!saving}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="at-outline"
                  size={20}
                  color={colors.textMuted}
                />

                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!saving}
                />
              </View>

              <Text style={styles.hint}>Usernames are not case-sensitive.</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Role</Text>

              <View style={styles.roleOptions}>
                <RoleOption
                  selected={role === "staff"}
                  title="Staff"
                  description="POS operations and daily transactions"
                  icon="person-outline"
                  disabled={saving}
                  onPress={() => setRole("staff")}
                />

                <RoleOption
                  selected={role === "admin"}
                  title="Administrator"
                  description="Full access including administration"
                  icon="shield-checkmark-outline"
                  disabled={saving}
                  onPress={() => setRole("admin")}
                />
              </View>
            </View>

            <View style={styles.passwordSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>Change Password</Text>

                  <Text style={styles.sectionSubtitle}>
                    Leave blank to keep the current password.
                  </Text>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>New Password</Text>

                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.textMuted}
                  />

                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!saving}
                  />

                  <Pressable
                    hitSlop={10}
                    onPress={() => setShowPassword((current) => !current)}
                    disabled={saving}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>

                <Text style={styles.hint}>Minimum 6 characters.</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Confirm New Password</Text>

                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.textMuted}
                  />

                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!saving}
                  />

                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    disabled={saving}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.securityNote}>
                <View style={styles.securityIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={colors.success}
                  />
                </View>

                <View style={styles.securityContent}>
                  <Text style={styles.securityTitle}>Password protected</Text>

                  <Text style={styles.securityText}>
                    The new password is securely hashed before it is stored.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <AppButton
                title="Save Changes"
                icon="checkmark-circle-outline"
                fullWidth
                onPress={handleSave}
                disabled={saving}
              />

              <AppButton
                title="Cancel"
                variant="secondary"
                fullWidth
                onPress={() =>
                  router.replace({
                    pathname: "/user-details",
                    params: {
                      id: String(user.id),
                    },
                  })
                }
                disabled={saving}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type RoleOptionProps = {
  selected: boolean;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  disabled: boolean;
  onPress: () => void;
};

function RoleOption({
  selected,
  title,
  description,
  icon,
  disabled,
  onPress,
}: RoleOptionProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.roleOption,
        selected && styles.roleOptionSelected,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.roleIcon, selected && styles.roleIconSelected]}>
        <Ionicons
          name={icon}
          size={22}
          color={selected ? colors.primary : colors.textSecondary}
        />
      </View>

      <View style={styles.roleContent}>
        <Text style={styles.roleTitle}>{title}</Text>

        <Text style={styles.roleDescription}>{description}</Text>
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
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
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.xl,
  },

  errorContent: {
    padding: spacing.lg,
    paddingBottom: spacing["4xl"],
    flexGrow: 1,
  },

  errorAction: {
    alignItems: "center",
    marginTop: spacing.sm,
  },

  errorCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: theme.radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  errorText: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.small,
    color: colors.danger,
  },

  form: {
    width: "100%",
  },

  field: {
    marginBottom: spacing.lg,
  },

  label: {
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  inputContainer: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.sm,
    paddingVertical: 13,
    ...typography.body,
    color: colors.text,
  },

  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  roleOptions: {
    gap: spacing.sm,
  },

  roleOption: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },

  roleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },

  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.sm,
    backgroundColor: colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  roleIconSelected: {
    backgroundColor: colors.white,
  },

  roleContent: {
    flex: 1,
    marginHorizontal: spacing.md,
  },

  roleTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  roleDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: colors.primary,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: theme.radius.full,
    backgroundColor: colors.primary,
  },

  passwordSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },

  securityNote: {
    backgroundColor: colors.successLight,
    borderRadius: theme.radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginTop: -spacing.xs,
    marginBottom: spacing.xl,
  },

  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  securityContent: {
    flex: 1,
    marginLeft: spacing.md,
  },

  securityTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  securityText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  pressed: {
    opacity: 0.75,
  },
});
