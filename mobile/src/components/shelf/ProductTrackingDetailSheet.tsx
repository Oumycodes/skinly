import { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import type { ScanDetail } from '../../services/dashboard';
import { shortenProductName } from '../../utils/productName';
import {
  buildOverallTrialSeries,
  buildTrialMeasureSeries,
  type MeasureSeriesPoint,
  type ProductTracking,
} from '../../utils/productTracking';

const UP = '#2E8B57';
const DOWN = '#C4544F';
const FLAT = '#78716C';

interface ProductTrackingDetailSheetProps {
  tracking: ProductTracking | null;
  history: ScanDetail[];
  onClose: () => void;
}

interface MetricOption {
  id: string;
  label: string;
  points: MeasureSeriesPoint[];
  delta: number | null;
}

function summaryCopy(tracking: ProductTracking): string {
  if (tracking.aiSummary) return tracking.aiSummary;
  if (tracking.product.tracking_enabled === false) {
    return 'This product is on your shelf but not being tracked against scans.';
  }
  return 'Keep using this product daily — log scans over the coming weeks to monitor changes.';
}

function TrendChart({ points, color }: { points: MeasureSeriesPoint[]; color: string }) {
  const width = 320;
  const height = 128;
  const padX = 10;
  const padTop = 12;
  const padBottom = 20;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBottom;

  if (points.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>
          {points.length === 1
            ? 'One more scan to chart this'
            : 'Scan during the trial to see your trend'}
        </Text>
      </View>
    );
  }

  const scores = points.map((p) => p.score);
  const min = Math.max(0, Math.min(...scores) - 0.8);
  const max = Math.min(10, Math.max(...scores) + 0.8);
  const range = max - min || 1;

  const xy = points.map((p, i) => ({
    x: padX + (i / (points.length - 1)) * chartW,
    y: padTop + chartH - ((p.score - min) / range) * chartH,
  }));
  const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${line} L ${xy[xy.length - 1].x} ${padTop + chartH} L ${xy[0].x} ${padTop + chartH} Z`;
  const lastPt = xy[xy.length - 1];

  return (
    <>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.26" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#trend)" />
        <Path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={lastPt.x} cy={lastPt.y} r={5.5} fill="#FFFFFF" />
        <Circle cx={lastPt.x} cy={lastPt.y} r={3.5} fill={color} />
      </Svg>
      <View style={styles.axis}>
        <Text style={styles.axisLabel}>
          {points[0].day === 0 ? 'Start' : `Day ${points[0].day}`}
        </Text>
        <Text style={styles.axisLabel}>
          {points[points.length - 1].day === 0
            ? 'Start'
            : `Day ${points[points.length - 1].day}`}
        </Text>
      </View>
    </>
  );
}

export function ProductTrackingDetailSheet({
  tracking,
  history,
  onClose,
}: ProductTrackingDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState('overall');

  const isTracking = tracking?.product.tracking_enabled !== false;

  const options: MetricOption[] = useMemo(() => {
    if (!tracking || !isTracking) return [];
    const overall = buildOverallTrialSeries(tracking.product, history, tracking.trialDays);
    const overallDelta =
      overall.length >= 2
        ? Math.round((overall[overall.length - 1].score - overall[0].score) * 10) / 10
        : null;
    const measures = buildTrialMeasureSeries(tracking.product, history, tracking.trialDays);
    return [
      { id: 'overall', label: 'Overall', points: overall, delta: overallDelta },
      ...measures.map((m) => ({
        id: m.id,
        label: m.label,
        points: m.points,
        delta: m.delta,
      })),
    ];
  }, [tracking, history, isTracking]);

  if (!tracking) return null;

  const title = shortenProductName(tracking.product.name, tracking.product.brand);
  const daysLeft = Math.max(0, tracking.trialDays - tracking.day);
  const selected = options.find((o) => o.id === selectedId) ?? options[0] ?? null;

  const selectedColor =
    selected?.delta == null || selected.delta === 0
      ? FLAT
      : selected.delta > 0
        ? UP
        : DOWN;

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
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            {isTracking ? (
              <View style={styles.hero}>
                <View>
                  <Text style={styles.heroLabel}>YOUR TRIAL</Text>
                  <Text style={styles.heroDay}>Day {tracking.day}</Text>
                  <Text style={styles.heroSub}>
                    {daysLeft > 0 ? `${daysLeft} days left` : 'Trial complete'}
                  </Text>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(1, tracking.progress) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  Day {tracking.day} of {tracking.trialDays}
                </Text>
              </View>
            ) : null}

            {isTracking && selected ? (
              <View style={styles.chartCard}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                >
                  {options.map((opt) => {
                    const active = opt.id === selectedId;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setSelectedId(opt.id)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <TrendChart points={selected.points} color={selectedColor} />
              </View>
            ) : null}

            <Text style={styles.summary}>{summaryCopy(tracking)}</Text>
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
    gap: 4,
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
  close: {
    fontSize: 16,
    color: colors.textMuted,
    paddingTop: 2,
  },
  hero: {
    borderRadius: radii.lg,
    padding: spacing.screen,
    marginTop: 4,
    backgroundColor: colors.primaryLight,
    gap: 12,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    ...font.semibold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.primaryDark,
  },
  heroDay: {
    ...font.bold,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: colors.text,
  },
  heroSub: {
    ...font.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  heroChangeCol: {
    alignItems: 'flex-end',
    gap: 3,
    paddingTop: 2,
  },
  heroChangeLabel: {
    ...font.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  changeLg: {
    ...font.bold,
    fontSize: 18,
  },
  changeSm: {
    ...font.semibold,
    fontSize: 13,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: 16,
    gap: 10,
    shadowColor: colors.textMuted,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  chips: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  chipText: {
    ...font.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.surface,
  },
  chartValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartValue: {
    ...font.bold,
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.text,
  },
  chartValueMax: {
    ...font.medium,
    fontSize: 14,
    color: colors.textMuted,
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
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    ...type.bodySmall,
    textAlign: 'center',
  },
  summary: {
    ...type.body,
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
