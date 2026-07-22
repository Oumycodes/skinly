import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { cardChrome } from '../../constants/cards';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import { shortenProductName } from '../../utils/productName';
import { guessCategory } from '../../utils/productCategory';
import {
  categoryIcon,
  trackingProgressLabel,
  type ProductTracking,
  type TrackingStatus,
} from '../../utils/productTracking';

interface TrackingProductCardProps {
  tracking: ProductTracking;
  onPress?: () => void;
  onRemove?: (id: string) => void;
}

const STATUS_STYLE: Record<TrackingStatus, { bg: string; color: string }> = {
  working: { bg: '#E8F3E8', color: '#3F6B3F' },
  on_track: { bg: '#F5EFD8', color: '#8A6E2F' },
  check_this: { bg: '#FCE8E8', color: '#B04A4A' },
};

export function TrackingProductCard({
  tracking,
  onPress,
  onRemove,
}: TrackingProductCardProps) {
  const category = guessCategory(tracking.product.name, tracking.product.ingredients);
  const statusStyle = STATUS_STYLE[tracking.status];
  const imageUrl = tracking.product.image_url;
  const isTracking = tracking.product.tracking_enabled !== false;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <Text style={styles.icon}>{categoryIcon(category)}</Text>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {shortenProductName(tracking.product.name, tracking.product.brand)}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {isTracking
              ? `Day ${tracking.day} of ${tracking.trialDays}`
              : tracking.product.brand || 'On shelf'}
          </Text>
        </View>

        <View style={styles.rightCol}>
          {isTracking ? (
            <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.badgeText, { color: statusStyle.color }]}>
                {tracking.statusLabel}
              </Text>
            </View>
          ) : null}
          {onRemove ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                void onRemove(tracking.product.id);
              }}
              hitSlop={8}
            >
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {isTracking ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${tracking.progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{trackingProgressLabel(tracking)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardChrome,
    borderRadius: radii.md,
    padding: 16,
    gap: spacing.item,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.item,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImage: {
    width: 44,
    height: 44,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
  },
  name: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  meta: {
    ...type.bodySmall,
    color: colors.textSecondary,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    ...font.semibold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  remove: {
    fontSize: 13,
    color: colors.textMuted,
  },
  progressBlock: {
    gap: 8,
    paddingLeft: 56,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.dark,
  },
  progressLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
});
