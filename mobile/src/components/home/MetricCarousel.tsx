import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CircularProgress } from '../ui/CircularProgress';
import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';

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
    gap: 12,
    paddingRight: 4,
  },
  card: {
    width: 120,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  value: {
    fontFamily: fonts.serifRegular,
    fontSize: 22,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
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
