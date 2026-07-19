import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { sharedCardStyles } from '../../constants/cards';
import { spacing } from '../../constants/spacing';
import { type } from '../../constants/typography';
import type { ScanAngle, ScanMetricId, SkinCondition } from '../../services/scan';
import type { MetricInsight } from '../../services/dashboard';
import {
  buildMeasuresFromInsights,
  buildSkinMeasures,
  type SkinMeasureId,
} from '../../utils/skinMeasures';
import { buildDisplayMetrics, primaryRegion, scoreToTen } from '../../utils/scanMetrics';
import { MeasureBadgeGrid, MeasureListRow } from '../home/MeasureListRow';
import { InteractiveScanPhoto } from './InteractiveScanPhoto';
import { MeasureSuggestions } from './MeasureSuggestions';
import { SkinMeasureCarousel } from './SkinMeasureCarousel';

const MEASURE_TO_METRIC: Record<SkinMeasureId, ScanMetricId> = {
  hydration: 'hydration',
  oiliness: 'oil_balance',
  acne: 'clarity',
  barrier: 'calmness',
  aging: 'fine_lines',
  texture: 'smoothness',
};

const METRIC_TO_MEASURE: Partial<Record<ScanMetricId, SkinMeasureId>> = {
  hydration: 'hydration',
  oil_balance: 'oiliness',
  clarity: 'acne',
  calmness: 'barrier',
  fine_lines: 'aging',
  smoothness: 'texture',
};

interface LatestScanPanelProps {
  score: number;
  summary: string;
  imageUrls: Partial<Record<ScanAngle, string>>;
  conditions: SkinCondition[];
  /** Pipeline insights from last scan — preferred over conditions */
  metricInsights?: MetricInsight[];
  smoothedScores?: Record<string, number> | null;
  variant?: 'home' | 'detail';
  onScanPress?: () => void;
  onZoomChange?: (zoomed: boolean) => void;
}

export function LatestScanPanel({
  score,
  summary,
  imageUrls,
  conditions,
  metricInsights,
  smoothedScores,
  variant = 'detail',
  onScanPress,
  onZoomChange,
}: LatestScanPanelProps) {
  const measures = useMemo(
    () =>
      buildMeasuresFromInsights(
        metricInsights ?? [],
        conditions,
        smoothedScores ?? null,
      ),
    [metricInsights, conditions, smoothedScores],
  );
  const displayMetrics = useMemo(() => {
    const scoreSource =
      smoothedScores && Object.keys(smoothedScores).length > 0
        ? smoothedScores
        : null;

    if (scoreSource) {
      const asApi = Object.entries(scoreSource).map(([id, score]) => ({
        id: id as ScanMetricId,
        label: id,
        score: score <= 10 ? score * 10 : score,
        regions: [],
      }));
      return buildDisplayMetrics(asApi, conditions);
    }

    if (metricInsights?.length) {
      const asApi = metricInsights.map((m) => ({
        id: m.id as ScanMetricId,
        label: m.label,
        score: m.score <= 10 ? m.score * 10 : m.score,
        regions: [],
      }));
      return buildDisplayMetrics(asApi, conditions);
    }

    return buildDisplayMetrics(undefined, conditions);
  }, [metricInsights, conditions, smoothedScores]);
  const [activeId, setActiveId] = useState<SkinMeasureId | null>(null);
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(() =>
    Math.max(0, measures.findIndex((m) => m.status !== 'good')),
  );

  const hasScan = score > 0 && Boolean(imageUrls.front);
  const activeMeasure = measures[carouselIndex] ?? measures[0];
  const activeMetricId = activeId ? MEASURE_TO_METRIC[activeId] : null;

  function handleMeasurePress(measureId: SkinMeasureId) {
    const metricId = MEASURE_TO_METRIC[measureId];
    const metric = displayMetrics.find((m) => m.id === metricId);

    if (activeId === measureId) {
      setActiveId(null);
      setActiveRegionIndex(0);
      return;
    }

    setActiveId(measureId);
    const index = measures.findIndex((m) => m.id === measureId);
    if (index >= 0) setCarouselIndex(index);

    if (metric) {
      const primary = primaryRegion(metric.regions);
      const regionIdx = primary
        ? metric.regions.findIndex(
            (r) => r.x === primary.x && r.y === primary.y && r.r === primary.r,
          )
        : 0;
      setActiveRegionIndex(regionIdx >= 0 ? regionIdx : 0);
    }
  }

  function handleCarouselChange(index: number) {
    setCarouselIndex(index);
    if (variant === 'home') {
      const measure = measures[index];
      if (measure) handleMeasurePress(measure.id);
    }
  }

  function handleZoomOut() {
    setActiveId(null);
    setActiveRegionIndex(0);
  }

  if (!hasScan) {
    return (
      <Pressable style={styles.empty} onPress={onScanPress}>
        <Ionicons name="camera-outline" size={36} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No scan yet</Text>
        <Text style={styles.emptyBody}>Take a face scan to see your skin analysis here</Text>
        {onScanPress && <Text style={styles.emptyCta}>Take your first scan →</Text>}
      </Pressable>
    );
  }

  return (
    <View style={[styles.panel, variant === 'home' && styles.panelHome]}>
      <View style={[styles.faceBlock, variant === 'home' && styles.faceBlockHome]}>
        <View style={variant === 'home' ? styles.photoBleed : undefined}>
          <InteractiveScanPhoto
            imageUrls={imageUrls}
            metrics={displayMetrics}
            activeMetricId={variant === 'home' ? activeMetricId : null}
            activeRegionIndex={activeRegionIndex}
            interactive={variant === 'home'}
            onRegionSelect={(metricId, regionIndex) => {
              const measureId = METRIC_TO_MEASURE[metricId];
              if (measureId) setActiveId(measureId);
              setActiveRegionIndex(regionIndex);
            }}
            onZoomOut={handleZoomOut}
            onZoomChange={onZoomChange}
          />
        </View>
      </View>

      {variant === 'home' && (
        <View style={sharedCardStyles.scoreCard}>
          <Text style={sharedCardStyles.scoreValue}>{scoreToTen(score)}</Text>
          {summary ? <Text style={sharedCardStyles.scoreSummary}>{summary}</Text> : null}
        </View>
      )}

      {variant === 'home' ? (
        <MeasureBadgeGrid>
          {measures.map((measure) => (
            <MeasureListRow
              key={measure.id}
              measure={measure}
              active={measure.id === activeId}
              onPress={() => handleMeasurePress(measure.id)}
            />
          ))}
        </MeasureBadgeGrid>
      ) : (
        <View style={styles.measureSection}>
          <SkinMeasureCarousel
            measures={measures}
            activeIndex={carouselIndex}
            onActiveIndexChange={handleCarouselChange}
          />

          <MeasureSuggestions measure={activeMeasure} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.section,
  },
  panelHome: {
    gap: spacing.titleBelow,
    marginTop: -4,
  },
  measureSection: {
    gap: spacing.item,
  },
  faceBlock: {
    gap: spacing.inner,
    backgroundColor: 'transparent',
  },
  faceBlockHome: {
    gap: 0,
    marginBottom: -4,
    marginHorizontal: -spacing.screen,
  },
  photoBleed: {
    width: '100%',
  },
  empty: {
    ...sharedCardStyles.surfaceCard,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: spacing.screen,
  },
  emptyTitle: {
    ...type.cardTitle,
  },
  emptyBody: {
    ...type.bodySmall,
    textAlign: 'center',
  },
  emptyCta: {
    ...type.link,
    fontSize: 14,
    marginTop: 4,
  },
});
