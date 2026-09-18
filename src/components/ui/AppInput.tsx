import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { theme } from "@/constants/theme";

type AppInputProps = TextInputProps & {
  label?: string;
  error?: string;
  required?: boolean;
};

export function AppInput({
  label,
  error,
  required = false,
  style,
  ...props
}: AppInputProps) {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TextInput
        {...props}
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textMuted}
      />

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  label: {
    marginBottom: spacing.sm,
    ...typography.bodyMedium,
    color: colors.text,
  },

  required: {
    color: colors.danger,
  },

  input: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.text,
  },

  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },

  error: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.danger,
  },
});
