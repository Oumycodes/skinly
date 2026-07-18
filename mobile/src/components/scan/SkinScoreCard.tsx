import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { type } from '../../constants/typography';

interface SkinScoreCardProps {
  score: number;
}

function scoreToTen(score: number): string {
  return (score / 10).toFixed(1);
}

export function SkinScoreCard({ score }: SkinScoreCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{scoreToTen(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.section,
    alignItems: 'center',
  },
  value: {
    ...type.stat,
    fontSize: 64,
    lineHeight: 72,
    color: colors.surface,
  },
});
