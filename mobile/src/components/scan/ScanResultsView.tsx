import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { sharedCardStyles } from '../../constants/cards';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import type { ScanAngle, ScanMetricId, ScanResult } from '../../services/scan';
import {
  buildDisplayMetrics,
  primaryRegion,
  scoreToTen,
  type DisplayMetric,
} from '../../utils/scanMetrics';
import { InteractiveScanPhoto } from './InteractiveScanPhoto';

interface ScanResultsViewProps {
  result: ScanResult;
  imageUrls: Partial<Record<ScanAngle, string>>;
  onZoomChange?: (zoomed: boolean) => void;
}

function MetricBadge({
  metric,
  active,
  onPress,
}: {
  metric: DisplayMetric;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[sharedCardStyles.badge, active && sharedCardStyles.badgeActive]} onPress={onPress}>
      <Text style={[sharedCardStyles.badgeLabel, active && sharedCardStyles.badgeLabelActive]} numberOfLines={1}>
        {metric.label}
      </Text>
      <Text style={[sharedCardStyles.badgeScore, active && sharedCardStyles.badgeScoreActive]}>
        {metric.score10.toFixed(1)}
      </Text>
    </Pressable>
  );
}

export function ScanResultsView({ result, imageUrls, onZoomChange }: ScanResultsViewProps) {
  const metrics = useMemo(
    () =>
      buildDisplayMetrics(result.metrics, result.conditions, {
        findings: result.findings,
        zones: result.zones,
      }),
    [result.conditions, result.findings, result.metrics, result.zones],
  );

  const [activeMetricId, setActiveMetricId] = useState<ScanMetricId | null>(null);
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);

  function handleMetricPress(metric: DisplayMetric) {
    if (activeMetricId === metric.id) {
      setActiveMetricId(null);
      setActiveRegionIndex(0);
      return;
    }

    setActiveMetricId(metric.id);
    const primary = primaryRegion(metric.regions);
    if (!primary) {
      setActiveRegionIndex(0);
      return;
    }
    const idx = metric.regions.findIndex(
      (r) => r.x === primary.x && r.y === primary.y && r.r === primary.r,
    );
    setActiveRegionIndex(idx >= 0 ? idx : 0);
  }

  function handleZoomOut() {
    setActiveMetricId(null);
    setActiveRegionIndex(0);
  }

  return (
    <View style={styles.root}>
      <View style={styles.photoSection}>
        <InteractiveScanPhoto
          imageUrls={imageUrls}
          metrics={metrics}
          activeMetricId={activeMetricId}
          activeRegionIndex={activeRegionIndex}
          onRegionSelect={(metricId, regionIndex) => {
            setActiveMetricId(metricId);
            setActiveRegionIndex(regionIndex);
          }}
          onZoomOut={handleZoomOut}
          onZoomChange={onZoomChange}
        />
      </View>

      <View style={styles.body}>
        <View style={sharedCardStyles.scoreCard}>
          <Text style={sharedCardStyles.scoreValue}>
            {scoreToTen(result.overall ?? result.overall_score)}
          </Text>
          <Text style={sharedCardStyles.scoreSummary}>{result.summary}</Text>
          {result.see_professional ? (
            <Text style={styles.proNote}>
              Some findings may benefit from a professional opinion — this is not a diagnosis.
            </Text>
          ) : null}
        </View>

        <View style={sharedCardStyles.badgeGrid}>
          {metrics.map((metric) => (
            <MetricBadge
              key={metric.id}
              metric={metric}
              active={activeMetricId === metric.id}
              onPress={() => handleMetricPress(metric)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  photoSection: {
    marginHorizontal: -spacing.screen,
    marginBottom: spacing.section,
    backgroundColor: colors.background,
  },
  body: {
    gap: spacing.section,
  },
  proNote: {
    marginTop: spacing.inner,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
