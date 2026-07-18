import { StyleSheet, Text, View } from 'react-native';

import { CircularProgress } from '../ui/CircularProgress';
import { cardChrome } from '../../constants/cards';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { type } from '../../constants/typography';
import type { MetricItem } from '../home/MetricCarousel';

interface MetricGridProps {
  metrics: MetricItem[];
}

export function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <View style={styles.grid}>
      {metrics.map((metric) => (
        <View key={metric.id} style={styles.card}>
          <Text style={styles.value}>{metric.value}</Text>
          <Text style={styles.label}>{metric.label}</Text>
          <View style={styles.ring}>
            <CircularProgress
              progress={metric.progress}
              size={64}
              strokeWidth={5}
              color={metric.color}
              trackColor={metric.trackColor}
            >
              <Text style={styles.icon}>{metric.icon}</Text>
            </CircularProgress>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.item,
  },
  card: {
    flex: 1,
    ...cardChrome,
    borderRadius: radii.md,
    padding: 14,
    alignItems: 'flex-start',
    minHeight: 150,
  },
  value: {
    ...type.metricScore,
    fontSize: 20,
    lineHeight: 24,
  },
  label: {
    ...type.bodySmall,
    fontSize: 12,
    marginTop: 2,
  },
  ring: {
    marginTop: 'auto',
    alignSelf: 'center',
    paddingTop: spacing.titleBelow,
  },
  icon: {
    fontSize: 14,
  },
});
