import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import type { UserRole } from "@/models/user";
import { createUser } from "@/repositories/userRepository";
import { hashPassword } from "@/utils/password";

export default function AddUserScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (saving) {
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

    if (!password) {
      setError("Password is required.");
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

    try {
      setSaving(true);

      const passwordHash = await hashPassword(password);

      await createUser({
        fullName: trimmedName,
        username: trimmedUsername,
        passwordHash,
        role,
      });

      Alert.alert(
        "User Created",
        `${trimmedName} can now use the POS with their new account.`,
        [
          {
            text: "Done",
            onPress: () => router.replace("/users"),
          },
        ],
      );
    } catch (saveError) {
      console.error("Failed to create user:", saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to create the user.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.replace("/users")}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.heroIcon}>
            <Ionicons
              name="person-add-outline"
              size={28}
              color={colors.primary}
            />
          </View>

          <Text style={styles.heroTitle}>Add User</Text>

          <Text style={styles.heroSubtitle}>
            Create an account for a staff member or administrator
          </Text>
        </View>

        <View style={styles.form}>
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
              <Ionicons name="at-outline" size={20} color={colors.textMuted} />

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

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.textMuted}
              />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
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
            <Text style={styles.label}>Confirm Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.textMuted}
              />

              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
              />

              <Pressable
                hitSlop={10}
                onPress={() => setShowConfirmPassword((current) => !current)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
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
                The password is securely hashed before it is stored.
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              saving && styles.saveButtonDisabled,
              pressed && !saving && styles.pressed,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color={colors.white}
              />
            )}

            <Text style={styles.saveButtonText}>
              {saving ? "Creating User..." : "Create User"}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.replace("/users")}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
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
    paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  backButton: {
    position: "absolute",
    top: 54,
    left: PAGE_PADDING,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
  },

  heroSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },

  form: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.xl,
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
    borderRadius: 14,
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
    borderRadius: 16,
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
    borderRadius: 13,
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
    borderRadius: 11,
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
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  securityNote: {
    backgroundColor: colors.successLight,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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

  saveButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    ...typography.button,
    color: colors.white,
  },

  cancelButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },

  cancelButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },

  errorCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  errorText: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.small,
    color: colors.danger,
  },

  pressed: {
    opacity: 0.75,
  },
});
