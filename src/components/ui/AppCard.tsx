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
  style?: StyleProp<ViewStyle>;
};

export function AppCard({
  children,
  onPress,
  padding = spacing.lg,
  style,
}: AppCardProps) {
  const content = (
    <View style={[styles.card, { padding }, style]}>{children}</View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
  },

  pressable: {
    borderRadius: theme.radius.lg,
  },

  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
});
