import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { theme } from "@/constants/theme";
import { typography } from "@/constants/typography";
import type { Promotion } from "@/models/promotion";

type PromotionCardProps = {
  promotion: Promotion;
};

export function PromotionCard({ promotion }: PromotionCardProps) {
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

  const imageUrl = isTablet
    ? promotion.tabletImageUrl
    : promotion.mobileImageUrl;

  const handlePress = async () => {
    if (!promotion.linkUrl) {
      return;
    }

    try {
      await Linking.openURL(promotion.linkUrl);
    } catch (error) {
      console.error("Failed to open promotion link:", error);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!promotion.linkUrl}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Promotion image */}
      <View style={styles.imageArea}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.promotionImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <View style={styles.imageIcon}>
              <Ionicons
                name="construct-outline"
                size={30}
                color={colors.primary}
              />
            </View>

            <Text style={styles.imagePlaceholderTitle}>Laundry Equipment</Text>

            <Text style={styles.imagePlaceholderSubtitle}>
              Maintenance &amp; services
            </Text>
          </View>
        )}

        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>Sponsored</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.businessRow}>
          <Text style={styles.businessName} numberOfLines={1}>
            {promotion.businessName}
          </Text>

          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {promotion.title}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {promotion.description}
        </Text>

        <View style={styles.actionRow}>
          <Text style={styles.actionText}>Learn more</Text>

          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  imageArea: {
    height: 128,
    backgroundColor: colors.primaryLight,
    position: "relative",
  },

  promotionImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  imageIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },

  imagePlaceholderTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: "700",
  },

  imagePlaceholderSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },

  sponsoredBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: "rgba(255,255,255,0.88)",
  },

  sponsoredText: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },

  content: {
    padding: spacing.md,
  },

  businessRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },

  businessName: {
    flex: 1,
    ...typography.small,
    color: colors.textMuted,
    fontWeight: "600",
  },

  title: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
  },

  description: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 17,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.sm,
  },

  actionText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: "700",
  },

  pressed: {
    opacity: 0.84,
  },
});
