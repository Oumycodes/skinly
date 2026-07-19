import type { ScanMetric, ScanMetricId, PipelineMetricId, PipelineFinding, PipelineMetrics, SkinCondition, ZoneBBox } from '../services/scan';
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
  /** Score on 0–10 scale for display */
  score10: number;
  regions: MetricRegion[];
  hasIssue: boolean;
}

export const METRIC_ORDER: PipelineMetricId[] = [
  'hydration',
  'oil_balance',
  'clarity',
  'calmness',
  'smoothness',
  'fine_lines',
];

export const METRIC_LABELS: Record<PipelineMetricId, string> = {
  hydration: 'Hydration',
  oil_balance: 'Oil balance',
  clarity: 'Clarity',
  calmness: 'Calmness',
  smoothness: 'Smoothness',
  fine_lines: 'Fine lines',
};

/** Fallback zones when the model returns no regions */
const PRESET_REGIONS: Record<PipelineMetricId, MetricRegion[]> = {
  hydration: [{ x: 0.5, y: 0.22, r: 0.11 }],
  oil_balance: [
    { x: 0.5, y: 0.4, r: 0.1 },
    { x: 0.68, y: 0.42, r: 0.07 },
  ],
  clarity: [{ x: 0.65, y: 0.58, r: 0.08 }],
  calmness: [
    { x: 0.72, y: 0.63, r: 0.09 },
    { x: 0.26, y: 0.6, r: 0.07 },
  ],
  smoothness: [{ x: 0.58, y: 0.52, r: 0.08 }],
  fine_lines: [{ x: 0.5, y: 0.3, r: 0.08 }],
};

/** Map legacy skin-measure ids → pipeline metrics */
const SKIN_MEASURE_TO_METRIC: Record<SkinMeasureId, PipelineMetricId> = {
  hydration: 'hydration',
  oiliness: 'oil_balance',
  acne: 'clarity',
  barrier: 'calmness',
  aging: 'fine_lines',
  texture: 'smoothness',
};

function isPipelineMetrics(m: ScanMetric[] | PipelineMetrics | undefined): m is PipelineMetrics {
  return !!m && !Array.isArray(m) && typeof (m as PipelineMetrics).hydration === 'number';
}

/** Normalize scores that may be 0–10 (pipeline) or 0–100 (legacy storage). */
export function toScore10(score: number): number {
  if (score <= 10) return Math.round(score * 10) / 10;
  return Math.round(score) / 10;
}

export function scoreToTen(score: number): string {
  return toScore10(score).toFixed(1);
}

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

function regionsFromFindings(
  findings: PipelineFinding[] | undefined,
  zones: Record<string, ZoneBBox> | undefined,
  metricId: PipelineMetricId,
): MetricRegion[] {
  const kept = (findings ?? []).filter((f) => f.confidence >= 0.7);
  if (metricId === 'clarity' && kept.length > 0) {
    return kept.map((f) => ({ x: f.cx, y: f.cy, r: Math.max(f.r, 0.04) }));
  }
  if (metricId === 'calmness' && zones) {
    const cheek = zones.left_cheek || zones.right_cheek;
    if (cheek) {
      return [{ x: cheek.x + cheek.w / 2, y: cheek.y + cheek.h / 2, r: Math.min(cheek.w, cheek.h) / 2 }];
    }
  }
  return PRESET_REGIONS[metricId];
}

export function buildDisplayMetrics(
  apiMetrics: ScanMetric[] | PipelineMetrics | undefined,
  conditions: SkinCondition[] | undefined,
  options?: {
    findings?: PipelineFinding[];
    zones?: Record<string, ZoneBBox>;
  },
): DisplayMetric[] {
  const scoreById = new Map<PipelineMetricId, number>();

  if (isPipelineMetrics(apiMetrics)) {
    for (const id of METRIC_ORDER) {
      scoreById.set(id, toScore10(apiMetrics[id]));
    }
  } else if (Array.isArray(apiMetrics)) {
    for (const m of apiMetrics) {
      const id = m.id as PipelineMetricId;
      if (METRIC_ORDER.includes(id)) {
        scoreById.set(id, toScore10(m.score));
      }
      // Legacy name map
      const legacyMap: Record<string, PipelineMetricId> = {
        dryness: 'hydration',
        oiliness: 'oil_balance',
        acne: 'clarity',
        redness: 'calmness',
        texture: 'smoothness',
      };
      const mapped = legacyMap[m.id];
      if (mapped && !scoreById.has(mapped)) {
        // Invert dryness/oiliness/acne/redness (old: high = bad) ≈ 10 - score/10
        const s10 = toScore10(m.score);
        const inverted = ['dryness', 'oiliness', 'acne', 'redness'].includes(m.id)
          ? Math.max(0, Math.min(10, 10 - s10))
          : s10;
        scoreById.set(mapped, inverted);
      }
    }
  }

  if (scoreById.size === 0 && conditions?.length) {
    const skinMeasures = buildSkinMeasures(conditions);
    for (const sm of skinMeasures) {
      const metricId = SKIN_MEASURE_TO_METRIC[sm.id];
      scoreById.set(metricId, toScore10(sm.healthScore));
    }
  }

  return METRIC_ORDER.map((id) => {
    const score10 = scoreById.get(id) ?? 7.5;
    const regions = regionsFromFindings(options?.findings, options?.zones, id);
    return {
      id,
      label: METRIC_LABELS[id],
      score: score10 * 10, // keep 0–100 internally for any legacy callers
      score10,
      regions,
      hasIssue: score10 < 6.5,
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
    if (!worst || metric.score10 < worst.score) {
      worst = { metric, region, score: metric.score10 };
    }
  }

  return worst ? { metric: worst.metric, region: worst.region } : null;
}
