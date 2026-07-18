import { StyleSheet, Text, View } from 'react-native';

import { CircularProgress } from '../ui/CircularProgress';
import { cardChrome } from '../../constants/cards';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';

interface SkinScoreCardProps {
  score: number;
  weeklyChange?: number;
}

export function SkinScoreCard({ score, weeklyChange = 0 }: SkinScoreCardProps) {
  const changeLabel =
    weeklyChange > 0
      ? `+${weeklyChange} this week`
      : weeklyChange < 0
        ? `${weeklyChange} this week`
        : 'No change this week';

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.label}>Skin score</Text>
        <Text style={[styles.change, weeklyChange >= 0 ? styles.changeUp : styles.changeDown]}>
          {changeLabel}
        </Text>
      </View>

      <CircularProgress
        progress={score / 100}
        size={108}
        strokeWidth={8}
        color={colors.primaryRing}
        trackColor="#EDEAE4"
      >
        <View style={styles.ringIcon}>
          <Text style={styles.leaf}>🌿</Text>
        </View>
      </CircularProgress>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardChrome,
    borderRadius: radii.lg,
    padding: spacing.section,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    gap: 2,
  },
  score: {
    ...type.stat,
    letterSpacing: -1,
  },
  label: {
    ...type.body,
    marginTop: 2,
  },
  change: {
    ...font.medium,
    fontSize: 14,
    marginTop: 6,
  },
  changeUp: {
    color: colors.primary,
  },
  changeDown: {
    color: colors.error,
  },
  ringIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaf: {
    fontSize: 18,
  },
});
