import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import type { ProductTracking } from '../../utils/productTracking';
import { shortenProductName } from '../../utils/productName';

interface CheckInBannerProps {
  tracking: ProductTracking;
  onSeeDetails?: () => void;
  onDismiss: () => void;
}

export function CheckInBanner({ tracking, onSeeDetails, onDismiss }: CheckInBannerProps) {
  const productName = shortenProductName(tracking.product.name, tracking.product.brand);

  return (
    <View style={styles.card}>
      <View style={styles.eyebrow}>
        <Ionicons name="notifications-outline" size={14} color="rgba(255,255,255,0.65)" />
        <Text style={styles.eyebrowText}>
          {tracking.day >= 28 ? '4-WEEK CHECK-IN' : '2-WEEK CHECK-IN'}
        </Text>
      </View>

      <Text style={styles.title}>
        It has been {tracking.day} days on {productName}.
      </Text>

      {tracking.checkInCopy ? (
        <Text style={styles.body}>{tracking.checkInCopy}</Text>
      ) : (
        <Text style={styles.body}>
          Keep scanning so we can show how this product is affecting your skin.
        </Text>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={onSeeDetails}>
          <Text style={styles.primaryBtnText}>See details</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onDismiss}>
          <Text style={styles.secondaryBtnText}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark,
    borderRadius: radii.lg,
    padding: spacing.screen,
    gap: spacing.item,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrowText: {
    ...font.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.65)',
  },
  title: {
    ...font.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  body: {
    ...font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.item,
    marginTop: spacing.inner,
  },
  primaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryBtnText: {
    ...font.semibold,
    fontSize: 14,
    color: colors.dark,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  secondaryBtnText: {
    ...font.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
