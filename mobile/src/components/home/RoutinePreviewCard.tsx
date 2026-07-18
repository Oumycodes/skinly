import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardChrome } from '../../constants/cards';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { type } from '../../constants/typography';

interface RoutinePreviewCardProps {
  period: 'AM' | 'PM';
  stepCount: number;
  stepsPreview: string;
  status?: 'READY' | 'PENDING';
  onPress?: () => void;
}

export function RoutinePreviewCard({
  period,
  stepCount,
  stepsPreview,
  status = 'READY',
  onPress,
}: RoutinePreviewCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name="checkmark-circle-outline" size={22} color={colors.accent.blue} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>
          {period} · {stepCount} steps
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {stepsPreview}
        </Text>
      </View>
      <View style={[styles.badge, status === 'PENDING' && styles.badgePending]}>
        <Text style={[styles.badgeText, status === 'PENDING' && styles.badgeTextPending]}>
          {status}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardChrome,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.item,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.inner,
  },
  title: {
    ...type.cardTitle,
  },
  preview: {
    ...type.bodySmall,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  badgePending: {
    backgroundColor: colors.surfaceMuted,
  },
  badgeText: {
    ...type.statLabel,
    color: colors.primaryDark,
  },
  badgeTextPending: {
    color: colors.textMuted,
  },
});
