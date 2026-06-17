import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import type { ProgressWeekPoint } from '../../services/progress';

interface ProgressChartCardProps {
  score: number;
  change: number;
  chartPoints?: ProgressWeekPoint[];
}

export function ProgressChartCard({ score, change, chartPoints = [] }: ProgressChartCardProps) {
  const width = 280;
  const height = 100;
  const padding = 12;
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
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  score: {
    fontFamily: fonts.serif,
    fontSize: 48,
    lineHeight: 54,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  badgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  emptyChart: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  axisLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  axisNow: {
    color: colors.text,
    fontFamily: fonts.sansSemiBold,
  },
});
