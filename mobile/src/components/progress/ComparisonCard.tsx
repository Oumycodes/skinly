import { StyleSheet, Text, View } from 'react-native';

import { cardChrome } from '../../constants/cards';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { type } from '../../constants/typography';

interface ComparisonCardProps {
  score: number;
  variant: 'before' | 'after';
}

export function ComparisonCard({ score, variant }: ComparisonCardProps) {
  const isBefore = variant === 'before';

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, isBefore ? styles.iconBefore : styles.iconAfter]}>
        <Text style={styles.icon}>📷</Text>
      </View>
      <Text style={styles.score}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    ...cardChrome,
    borderRadius: radii.lg,
    padding: spacing.screen,
    alignItems: 'center',
    gap: spacing.item,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBefore: {
    backgroundColor: colors.accent.peach,
  },
  iconAfter: {
    backgroundColor: colors.primaryLight,
  },
  icon: {
    fontSize: 22,
  },
  score: {
    ...type.metricScore,
    fontSize: 36,
    lineHeight: 40,
  },
});
