import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';

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
        <Text style={styles.icon}>☑</Text>
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
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    color: colors.accent.blue,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  preview: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
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
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  badgeTextPending: {
    color: colors.textMuted,
  },
});
