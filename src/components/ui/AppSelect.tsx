import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { PAGE_PADDING } from "@/constants/layout";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";

export type AppSelectOption<T extends string> = {
  label: string;
  value: T;
};

type AppSelectProps<T extends string> = {
  label?: string;
  value: T;
  options: AppSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
};

export function AppSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
}: AppSelectProps<T>) {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

  const displayValue = selectedOption?.label ?? placeholder;

  const handleSelect = (nextValue: T) => {
    onChange(nextValue);
    setVisible(false);
  };

  return (
    <>
      <View style={styles.container}>
        {label ? <Text style={styles.label}>{label}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: visible }}
          onPress={() => setVisible(true)}
          style={({ pressed }) => [
            styles.field,
            pressed && styles.fieldPressed,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.value, !selectedOption && styles.placeholder]}
          >
            {displayValue}
          </Text>

          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable
            style={styles.modalCard}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label ?? "Select"}</Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => setVisible(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={styles.optionsList}>
              {options.map((option) => {
                const selected = option.value === value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => handleSelect(option.value)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>

                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  label: {
    marginBottom: spacing.sm,
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  field: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  fieldPressed: {
    opacity: 0.82,
  },

  value: {
    ...typography.small,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },

  placeholder: {
    color: colors.textMuted,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(31, 29, 36, 0.35)",
    justifyContent: "center",
    paddingHorizontal: PAGE_PADDING,
  },

  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.xl,
    padding: spacing.lg,
    maxHeight: "80%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  optionsList: {
    gap: spacing.xs,
  },

  option: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionSelected: {
    backgroundColor: colors.primaryLight,
  },

  optionPressed: {
    opacity: 0.75,
  },

  optionText: {
    ...typography.small,
    color: colors.text,
  },

  optionTextSelected: {
    color: colors.primaryDark,
    fontWeight: "600",
  },
});
