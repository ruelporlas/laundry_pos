import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
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
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const { login, loading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (loading) {
      return;
    }

    setError(null);

    try {
      await login(username, password);
    } catch (loginError) {
      console.error("Login failed:", loginError);

      setError(
        loginError instanceof Error ? loginError.message : "Unable to sign in.",
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.logo}>
            <Ionicons name="cart-outline" size={32} color={colors.primary} />
          </View>

          <Text style={styles.title}>Laundry POS</Text>

          <Text style={styles.subtitle}>Sign in to continue</Text>

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
              <Text style={styles.label}>Username</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
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
                  autoComplete="username"
                  editable={!loading}
                  returnKeyType="next"
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
                  autoComplete="password"
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />

                <Pressable
                  hitSlop={10}
                  onPress={() => setShowPassword((current) => !current)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                loading && styles.loginButtonDisabled,
                pressed && !loading && styles.pressed,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons
                  name="log-in-outline"
                  size={21}
                  color={colors.white}
                />
              )}

              <Text style={styles.loginButtonText}>
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.securityNote}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={colors.success}
            />

            <Text style={styles.securityText}>
              Your account credentials are securely protected.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: spacing["4xl"],
  },

  container: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    alignItems: "center",
  },

  logo: {
    width: 72,
    height: 72,
    borderRadius: theme.radius["2xl"],
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    ...typography.display,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.lg,
  },

  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },

  form: {
    width: "100%",
    marginTop: spacing["3xl"],
  },

  errorCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: theme.radius.md,
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

  field: {
    marginBottom: spacing.lg,
  },

  label: {
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  inputContainer: {
    minHeight: 52,
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
    paddingVertical: 14,
    ...typography.body,
    color: colors.text,
  },

  loginButton: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  loginButtonDisabled: {
    opacity: 0.65,
  },

  loginButtonText: {
    ...typography.button,
    color: colors.white,
  },

  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing["2xl"],
    paddingHorizontal: spacing.sm,
  },

  securityText: {
    flex: 1,
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    textAlign: "center",
  },

  pressed: {
    opacity: 0.75,
  },
});
