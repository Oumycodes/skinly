import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CircularProgress } from '../ui/CircularProgress';
import { cardChrome } from '../../constants/cards';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { type } from '../../constants/typography';

export interface MetricItem {
  id: string;
  value: string;
  label: string;
  progress: number;
  color: string;
  trackColor: string;
  icon: string;
}

interface MetricCarouselProps {
  metrics: MetricItem[];
}

export function MetricCarousel({ metrics }: MetricCarouselProps) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        snapToInterval={132}
        decelerationRate="fast"
      >
        {metrics.map((metric) => (
          <View key={metric.id} style={styles.card}>
            <Text style={styles.value}>{metric.value}</Text>
            <Text style={styles.label}>{metric.label}</Text>
            <View style={styles.ringWrap}>
              <CircularProgress
                progress={metric.progress}
                size={72}
                strokeWidth={6}
                color={metric.color}
                trackColor={metric.trackColor}
              >
                <Text style={styles.icon}>{metric.icon}</Text>
              </CircularProgress>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {metrics.map((metric, i) => (
          <View key={metric.id} style={[styles.dot, i === 0 && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.item,
    paddingRight: spacing.inner / 2,
  },
  card: {
    width: 120,
    ...cardChrome,
    borderRadius: radii.md,
    padding: 16,
    alignItems: 'flex-start',
  },
  value: {
    ...type.metricScore,
  },
  label: {
    ...type.bodySmall,
    marginTop: 2,
  },
  ringWrap: {
    marginTop: 14,
    alignSelf: 'center',
  },
  icon: {
    fontSize: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.text,
    width: 8,
  },
});
