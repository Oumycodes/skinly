import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';

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
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
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
    fontFamily: fonts.serif,
    fontSize: 36,
    color: colors.text,
  },
});
