import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import type { ScanDetail } from '../../services/dashboard';
import type { UsageTime } from '../../services/products';
import { shortenProductName } from '../../utils/productName';
import {
  buildOverallTrialSeries,
  buildTrialMeasureSeries,
  type MeasureSeries,
  type MeasureSeriesPoint,
  type ProductTracking,
  type TrackingStatus,
} from '../../utils/productTracking';

interface ProductTrackingDetailSheetProps {
  tracking: ProductTracking | null;
  history: ScanDetail[];
  onClose: () => void;
}

const STATUS_STYLE: Record<TrackingStatus, { bg: string; color: string }> = {
  working: { bg: '#E8F3E8', color: '#3F6B3F' },
  on_track: { bg: '#F5EFD8', color: '#8A6E2F' },
  check_this: { bg: '#FCE8E8', color: '#B04A4A' },
};

const USAGE_LABEL: Record<UsageTime, string> = {
  morning: 'Morning',
  night: 'Night',
  both: 'AM · PM',
};

function deltaLabel(delta: number | null): string {
  if (delta == null) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}

function summaryCopy(tracking: ProductTracking): string {
  if (tracking.aiSummary) return tracking.aiSummary;
  if (tracking.product.tracking_enabled === false) {
    return 'This product is on your shelf but not being tracked against scans.';
  }
  if (tracking.startScore != null && tracking.latestScore != null && tracking.delta != null) {
    const label = tracking.targetLabel.toLowerCase();
    if (tracking.delta >= 0.3) {
      return `${label} improved from ${tracking.startScore.toFixed(1)} → ${tracking.latestScore.toFixed(1)} across ${tracking.scanCount} scan${tracking.scanCount === 1 ? '' : 's'}. Looking promising.`;
    }
    if (tracking.delta <= -0.3) {
      return `${label} moved from ${tracking.startScore.toFixed(1)} → ${tracking.latestScore.toFixed(1)}. Worth reviewing this trial.`;
    }
    return `${label} held steady (${tracking.startScore.toFixed(1)} → ${tracking.latestScore.toFixed(1)}). Keep using it consistently.`;
  }
  return 'Take a few scans during this trial to see how hydration, calmness, and other measures change.';
}

function MeasureChart({
  title,
  points,
  delta,
  accent = colors.dark,
}: {
  title: string;
  points: MeasureSeriesPoint[];
  delta: number | null;
  accent?: string;
}) {
  const width = 300;
  const height = 88;
  const padX = 8;
  const padY = 12;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const scores = points.map((p) => p.score);
  const min = scores.length ? Math.max(0, Math.min(...scores) - 0.8) : 0;
  const max = scores.length ? Math.min(10, Math.max(...scores) + 0.8) : 10;
  const range = max - min || 1;

  const polyline =
    points.length > 1
      ? points
          .map((p, i) => {
            const x = padX + (i / (points.length - 1)) * chartW;
            const y = padY + chartH - ((p.score - min) / range) * chartH;
            return `${x},${y}`;
          })
          .join(' ')
      : '';

  const last = points.length > 0 ? points[points.length - 1] : null;
  const lastXY =
    last && points.length > 1
      ? {
          x: padX + chartW,
          y: padY + chartH - ((last.score - min) / range) * chartH,
        }
      : null;

  const deltaColor =
    delta == null ? colors.textMuted : delta >= 0 ? '#3F6B3F' : '#B04A4A';

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={[styles.chartDelta, { color: deltaColor }]}>{deltaLabel(delta)}</Text>
      </View>

      {points.length >= 2 ? (
        <>
          <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            <Polyline
              points={polyline}
              fill="none"
              stroke={accent}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {lastXY ? (
              <Circle cx={lastXY.x} cy={lastXY.y} r={4} fill={accent} />
            ) : null}
          </Svg>
          <View style={styles.axis}>
            <Text style={styles.axisLabel}>Day {points[0].day}</Text>
            <Text style={styles.axisLabel}>Day {points[points.length - 1].day}</Text>
          </View>
        </>
      ) : (
        <View style={styles.chartEmpty}>
          <Text style={styles.chartEmptyText}>
            {points.length === 1
              ? 'Need one more scan to chart this'
              : 'No scans in this trial yet'}
          </Text>
        </View>
      )}

      {points.length >= 1 ? (
        <Text style={styles.chartMeta}>
          {points[0].score.toFixed(1)}
          {points.length > 1 ? ` → ${points[points.length - 1].score.toFixed(1)}` : ''}
          {' · '}
          {points.length} scan{points.length === 1 ? '' : 's'}
        </Text>
      ) : null}
    </View>
  );
}

export function ProductTrackingDetailSheet({
  tracking,
  history,
  onClose,
}: ProductTrackingDetailSheetProps) {
  const insets = useSafeAreaInsets();
  if (!tracking) return null;

  const isTracking = tracking.product.tracking_enabled !== false;
  const statusStyle = STATUS_STYLE[tracking.status];
  const usageTime = tracking.product.usage_time;
  const timesPerWeek = tracking.product.times_per_week;
  const title = shortenProductName(tracking.product.name, tracking.product.brand);

  const measureSeries: MeasureSeries[] = isTracking
    ? buildTrialMeasureSeries(tracking.product, history, tracking.trialDays)
    : [];
  const overallPoints = isTracking
    ? buildOverallTrialSeries(tracking.product, history, tracking.trialDays)
    : [];
  const overallDelta =
    overallPoints.length >= 2
      ? Math.round(
          (overallPoints[overallPoints.length - 1].score - overallPoints[0].score) * 10,
        ) / 10
      : null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.screen }]}>
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            <View style={styles.header}>
              {tracking.product.image_url ? (
                <Image
                  source={{ uri: tracking.product.image_url }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={styles.headerMeta}>
                <Text style={styles.name} numberOfLines={2}>
                  {title}
                </Text>
                {tracking.product.brand ? (
                  <Text style={styles.brand}>{tracking.product.brand}</Text>
                ) : null}
                <Text style={styles.dayLine}>
                  {isTracking
                    ? `Day ${tracking.day} of ${tracking.trialDays}`
                    : 'On shelf · not tracking'}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.badgeRow}>
              {isTracking ? (
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.color }]}>
                    {tracking.statusLabel}
                  </Text>
                </View>
              ) : null}
              {usageTime ? (
                <View style={styles.usageBadge}>
                  <Text style={styles.usageText}>{USAGE_LABEL[usageTime]}</Text>
                </View>
              ) : null}
              {timesPerWeek ? (
                <View style={styles.usageBadge}>
                  <Text style={styles.usageText}>{timesPerWeek}× / week</Text>
                </View>
              ) : null}
            </View>

            {isTracking ? (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${tracking.progress * 100}%` }]} />
              </View>
            ) : null}

            <Text style={styles.summary}>{summaryCopy(tracking)}</Text>
            {tracking.aiAdvice ? (
              <Text style={styles.advice}>{tracking.aiAdvice}</Text>
            ) : null}

            {isTracking ? (
              <>
                <Text style={styles.sectionTitle}>Skin score</Text>
                <MeasureChart
                  title="Overall"
                  points={overallPoints}
                  delta={overallDelta}
                  accent={colors.primary}
                />

                <Text style={styles.sectionTitle}>Measures this trial</Text>
                <Text style={styles.sectionHint}>
                  Dryness, redness, and more across the days you used this product.
                </Text>
                {measureSeries.map((series) => (
                  <MeasureChart
                    key={series.id}
                    title={series.label}
                    points={series.points}
                    delta={series.delta}
                    accent={
                      tracking.targetMeasures.includes(series.id)
                        ? colors.dark
                        : colors.textSecondary
                    }
                  />
                ))}
              </>
            ) : null}
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '92%',
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  scroll: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.item,
    gap: spacing.item,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  thumbPlaceholder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerMeta: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
  },
  name: {
    ...font.semibold,
    fontSize: 17,
    color: colors.text,
  },
  brand: {
    ...type.bodySmall,
  },
  dayLine: {
    ...font.medium,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  close: {
    fontSize: 16,
    color: colors.textMuted,
    paddingTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    ...font.semibold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  usageBadge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  usageText: {
    ...font.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.dark,
  },
  summary: {
    ...type.body,
    color: colors.textSecondary,
  },
  advice: {
    ...font.medium,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.inner,
  },
  sectionHint: {
    ...type.bodySmall,
    marginTop: -6,
  },
  chartCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 14,
    gap: 6,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    ...font.semibold,
    fontSize: 14,
    color: colors.text,
  },
  chartDelta: {
    ...font.semibold,
    fontSize: 14,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    ...font.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  chartEmpty: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    ...type.bodySmall,
    textAlign: 'center',
  },
  chartMeta: {
    ...type.caption,
    color: colors.textSecondary,
  },
  closeBtn: {
    marginHorizontal: spacing.screen,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    ...font.semibold,
    fontSize: 15,
    color: colors.text,
  },
});
