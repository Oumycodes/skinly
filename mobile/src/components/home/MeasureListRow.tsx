import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { sharedCardStyles } from '../../constants/cards';
import { colors } from '../../constants/colors';
import { MEASURE_LIST_LABEL, type SkinMeasure } from '../../utils/skinMeasures';

interface MeasureListRowProps {
  measure: SkinMeasure;
  active: boolean;
  onPress: () => void;
}

function scoreColor(score: number, active: boolean): string {
  if (active) return colors.surface;
  if (score <= 0) return colors.textMuted;
  if (score >= 80) return colors.text;
  if (score >= 60) return colors.textSecondary;
  return colors.textMuted;
}

export function MeasureListRow({ measure, active, onPress }: MeasureListRowProps) {
  const displayScore =
    measure.healthScore > 0 ? (measure.healthScore / 10).toFixed(1) : '—';

  return (
    <Pressable
      style={[sharedCardStyles.badge, active && sharedCardStyles.badgeActive]}
      onPress={onPress}
    >
      <Text
        style={[sharedCardStyles.badgeLabel, active && sharedCardStyles.badgeLabelActive]}
        numberOfLines={1}
      >
        {MEASURE_LIST_LABEL[measure.id]}
      </Text>
      <Text style={[sharedCardStyles.badgeScore, { color: scoreColor(measure.healthScore, active) }]}>
        {displayScore}
      </Text>
    </Pressable>
  );
}

interface MeasureBadgeGridProps {
  children: ReactNode;
}

export function MeasureBadgeGrid({ children }: MeasureBadgeGridProps) {
  return <View style={sharedCardStyles.badgeGrid}>{children}</View>;
}
