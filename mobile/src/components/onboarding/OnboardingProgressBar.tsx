import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

interface OnboardingProgressBarProps {
  progress: number;
  showBack: boolean;
  onBack?: () => void;
}

export function OnboardingProgressBar({ progress, showBack, onBack }: OnboardingProgressBarProps) {
  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable style={styles.back} onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(4, progress * 100)}%` }]} />
      </View>
      <View style={styles.backPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.inner,
    paddingHorizontal: spacing.screen,
  },
  back: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 32,
    height: 32,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.dark,
  },
});
