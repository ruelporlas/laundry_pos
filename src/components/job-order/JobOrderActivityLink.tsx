import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

import { styles } from "@/constants/jobOrderDetailsStyles";

type Props = {
  activityCount: number;
  onPress: () => void;
};

export function JobOrderActivityLink({ activityCount, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.activityHistoryLink,
        pressed && styles.activityHistoryLinkPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.activityHistoryLinkIcon}>
        <Ionicons name="time-outline" size={18} color={colors.primary} />
      </View>

      <View style={styles.activityHistoryLinkContent}>
        <Text style={styles.activityHistoryLinkTitle}>
          See Activity history
        </Text>

        <Text style={styles.activityHistoryLinkSubtitle}>
          {activityCount === 0
            ? "No activity recorded"
            : `${activityCount} ${
                activityCount === 1 ? "activity" : "activities"
              }`}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}
