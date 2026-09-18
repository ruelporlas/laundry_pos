import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";

/**
 * Legacy Expo theme compatibility.
 *
 * Some of the original Expo starter components still import
 * Colors and Spacing from this file.
 */
export const Colors = {
  light: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    icon: colors.textMuted,
    tabIconDefault: colors.textMuted,
    tabIconSelected: colors.primary,
  },

  dark: {
    text: colors.white,
    background: colors.text,
    tint: colors.accent,
    icon: colors.borderStrong,
    tabIconDefault: colors.borderStrong,
    tabIconSelected: colors.accent,
  },
} as const;

/**
 * Legacy spacing compatibility for the original Expo components.
 */
export const Spacing = {
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
  xxl: spacing["2xl"],
  xxxl: spacing["3xl"],
} as const;

/**
 * Main application design system.
 */
export const theme = {
  colors,
  spacing,
  typography,

  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    "2xl": 28,
    full: 999,
  },

  shadows: {
    small: {
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },

    medium: {
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },

    large: {
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 6,
    },
  },
} as const;

export type Theme = typeof theme;