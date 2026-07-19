import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { type } from '../../constants/typography';
import { scoreToTen } from '../../utils/scanMetrics';

interface SkinScoreCardProps {
  score: number;
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
