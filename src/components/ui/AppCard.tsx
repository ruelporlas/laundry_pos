import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";

type AppCardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: number;
  /** Styles applied to the inner card surface. */
  style?: StyleProp<ViewStyle>;
  /** Styles applied to the outer layout/touchable container. */
  outerStyle?: StyleProp<ViewStyle>;
};

export function AppCard({
  children,
  onPress,
  padding = spacing.lg,
  style,
  outerStyle,
}: AppCardProps) {
  const content = (
    <View style={[styles.card, { padding }, style]}>{children}</View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          outerStyle,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={outerStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    minWidth: 0,
  },

  pressable: {
    borderRadius: theme.radius.lg,
    minWidth: 0,
  },

  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
});
