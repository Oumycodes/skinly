import { StyleSheet, Text, View } from 'react-native';

import { CircularProgress } from '../ui/CircularProgress';
import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';
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
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    alignItems: 'flex-start',
    minHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  value: {
    fontFamily: fonts.serifRegular,
    fontSize: 20,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ring: {
    marginTop: 'auto',
    alignSelf: 'center',
    paddingTop: 12,
  },
  icon: {
    fontSize: 14,
  },
});
