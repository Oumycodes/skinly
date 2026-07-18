import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { cardChrome } from '../../constants/cards';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import type { ProgressWeekPoint } from '../../services/progress';

interface ProgressChartCardProps {
  score: number;
  change: number;
  chartPoints?: ProgressWeekPoint[];
}

export function ProgressChartCard({ score, change, chartPoints = [] }: ProgressChartCardProps) {
  const width = 280;
  const height = 100;
  const padding = spacing.titleBelow;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const scores = chartPoints.length > 0 ? chartPoints.map((p) => p.score) : [score];
  const min = Math.max(0, Math.min(...scores) - 10);
  const max = Math.min(100, Math.max(...scores) + 10);
  const range = max - min || 1;

  const points =
    chartPoints.length > 1
      ? chartPoints
          .map((p, i) => {
            const x = padding + (i / (chartPoints.length - 1)) * chartW;
            const y = padding + chartH - ((p.score - min) / range) * chartH;
            return `${x},${y}`;
          })
          .join(' ')
      : '';

  const changeLabel = change >= 0 ? `↑ +${change}` : `↓ ${change}`;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View>
          <Text style={styles.score}>{score || '—'}</Text>
          <Text style={styles.label}>Skin score · today</Text>
        </View>
        {chartPoints.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{changeLabel}</Text>
          </View>
        )}
      </View>

      {points ? (
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Polyline
            points={points}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>Take a weekly check-in to start tracking</Text>
        </View>
      )}

      {chartPoints.length > 0 && (
        <View style={styles.axis}>
          {chartPoints.map((p) => (
            <Text
              key={p.label}
              style={[styles.axisLabel, p.label === 'NOW' && styles.axisNow]}
            >
              {p.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardChrome,
    borderRadius: radii.lg,
    padding: spacing.screen,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.inner,
  },
  score: {
    ...type.stat,
    fontSize: 48,
    lineHeight: 54,
  },
  label: {
    ...type.bodySmall,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.item,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  badgeText: {
    ...font.semibold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  emptyChart: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...type.bodySmall,
    textAlign: 'center',
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.inner / 2,
  },
  axisLabel: {
    ...font.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  axisNow: {
    color: colors.text,
    ...font.semibold,
  },
});
