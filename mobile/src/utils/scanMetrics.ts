import type { ScanMetric, ScanMetricId } from '../services/scan';
import { buildSkinMeasures, type SkinMeasureId } from './skinMeasures';

export interface MetricRegion {
  x: number;
  y: number;
  r: number;
}

export interface DisplayMetric {
  id: ScanMetricId;
  label: string;
  score: number;
  regions: MetricRegion[];
  hasIssue: boolean;
}

export const METRIC_ORDER: ScanMetricId[] = [
  'dryness',
  'oiliness',
  'acne',
  'redness',
  'fine_lines',
  'texture',
];

export const METRIC_LABELS: Record<ScanMetricId, string> = {
  dryness: 'Dryness',
  oiliness: 'Oiliness',
  acne: 'Acne',
  redness: 'Redness',
  fine_lines: 'Fine lines',
  texture: 'Texture',
};

/** Fallback zones when the model returns no regions */
const PRESET_REGIONS: Record<ScanMetricId, MetricRegion[]> = {
  dryness: [{ x: 0.5, y: 0.22, r: 0.11 }],
  oiliness: [
    { x: 0.5, y: 0.4, r: 0.1 },
    { x: 0.68, y: 0.42, r: 0.07 },
  ],
  acne: [{ x: 0.65, y: 0.58, r: 0.08 }],
  redness: [
    { x: 0.72, y: 0.63, r: 0.09 },
    { x: 0.26, y: 0.6, r: 0.07 },
  ],
  fine_lines: [{ x: 0.5, y: 0.3, r: 0.08 }],
  texture: [{ x: 0.58, y: 0.52, r: 0.08 }],
};

const SKIN_MEASURE_TO_METRIC: Record<SkinMeasureId, ScanMetricId> = {
  hydration: 'dryness',
  oiliness: 'oiliness',
  acne: 'acne',
  barrier: 'redness',
  aging: 'fine_lines',
  texture: 'texture',
};

export function primaryRegion(regions: MetricRegion[]): MetricRegion | null {
  if (regions.length === 0) return null;
  return regions.reduce((best, r) => (r.r > best.r ? r : best), regions[0]!);
}

export function zoomScaleForRegion(r: number): number {
  return Math.min(3, Math.max(1.6, 0.35 / Math.max(r, 0.05)));
}

export function clampTranslate(
  tx: number,
  ty: number,
  scale: number,
  viewW: number,
  viewH: number,
) {
  const maxX = ((scale - 1) * viewW) / 2;
  const maxY = ((scale - 1) * viewH) / 2;
  return {
    tx: Math.max(-maxX, Math.min(maxX, tx)),
    ty: Math.max(-maxY, Math.min(maxY, ty)),
  };
}

export interface CoverLayout {
  offsetX: number;
  offsetY: number;
  displayW: number;
  displayH: number;
}

export function coverLayout(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
): CoverLayout {
  const coverScale = Math.max(containerW / imageW, containerH / imageH);
  const displayW = imageW * coverScale;
  const displayH = imageH * coverScale;
  return {
    offsetX: (containerW - displayW) / 2,
    offsetY: (containerH - displayH) / 2,
    displayW,
    displayH,
  };
}

export function regionToPixels(
  region: MetricRegion,
  layout: CoverLayout,
): { left: number; top: number; size: number } {
  const cx = layout.offsetX + region.x * layout.displayW;
  const cy = layout.offsetY + region.y * layout.displayH;
  const size = region.r * layout.displayW * 2;
  return {
    left: cx - size / 2,
    top: cy - size / 2,
    size,
  };
}

export function zoomTransformForRegion(
  region: MetricRegion,
  layout: CoverLayout,
  viewW: number,
  viewH: number,
) {
  const cx = layout.offsetX + region.x * layout.displayW;
  const cy = layout.offsetY + region.y * layout.displayH;
  const scale = zoomScaleForRegion(region.r);
  const rawTx = viewW / 2 - scale * cx;
  const rawTy = viewH / 2 - scale * cy;
  const { tx, ty } = clampTranslate(rawTx, rawTy, scale, viewW, viewH);
  return { scale, tx, ty };
}

export function buildDisplayMetrics(
  apiMetrics: ScanMetric[] | undefined,
  conditions: Parameters<typeof buildSkinMeasures>[0],
): DisplayMetric[] {
  const byId = new Map<ScanMetricId, ScanMetric>();
  for (const m of apiMetrics ?? []) {
    byId.set(m.id, m);
  }

  const skinMeasures = buildSkinMeasures(conditions);
  const scoreByMetric = new Map<ScanMetricId, number>();
  const issueByMetric = new Map<ScanMetricId, boolean>();
  for (const sm of skinMeasures) {
    const metricId = SKIN_MEASURE_TO_METRIC[sm.id];
    scoreByMetric.set(metricId, sm.healthScore);
    issueByMetric.set(metricId, sm.status !== 'good');
  }

  return METRIC_ORDER.map((id) => {
    const fromApi = byId.get(id);
    const regions = fromApi ? fromApi.regions : PRESET_REGIONS[id];
    const score = fromApi?.score ?? scoreByMetric.get(id) ?? 88;
    return {
      id,
      label: fromApi?.label ?? METRIC_LABELS[id],
      score,
      regions,
      hasIssue: issueByMetric.get(id) ?? score < 80,
    };
  });
}

export function findDefaultPulseRegion(metrics: DisplayMetric[]): {
  metric: DisplayMetric;
  region: MetricRegion;
} | null {
  let worst: { metric: DisplayMetric; region: MetricRegion; score: number } | null = null;

  for (const metric of metrics) {
    const region = primaryRegion(metric.regions);
    if (!region) continue;
    if (!worst || metric.score < worst.score) {
      worst = { metric, region, score: metric.score };
    }
  }

  return worst ? { metric: worst.metric, region: worst.region } : null;
}

export function scoreToTen(score: number): string {
  return (score / 10).toFixed(1);
}
