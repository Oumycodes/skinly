import type { ShelfProduct } from '../services/products';
import type { ScanDetail } from '../services/dashboard';
import {
  MEASURE_LIST_LABEL,
  buildSkinMeasures,
  type SkinMeasureId,
} from './skinMeasures';
import { guessCategory, type ProductCategory } from './productCategory';

export type TrackingStatus = 'working' | 'on_track' | 'check_this';
export type ShelfRole = 'trial' | 'routine';

export interface ProductTracking {
  product: ShelfProduct;
  role: ShelfRole;
  day: number;
  trialDays: number;
  targetMeasures: SkinMeasureId[];
  targetLabel: string;
  status: TrackingStatus;
  statusLabel: string;
  scoreSeries: number[];
  startScore: number | null;
  latestScore: number | null;
  delta: number | null;
  scanCount: number;
  checkInReady: boolean;
  checkInCopy: string | null;
  progress: number;
  aiSummary?: string | null;
  aiAdvice?: string | null;
}

/** Guess which skin measures a product is meant to improve */
export function targetMeasuresForProduct(product: ShelfProduct): SkinMeasureId[] {
  const text = `${product.name} ${product.brand ?? ''} ${product.ingredients.join(' ')}`.toLowerCase();
  const category = guessCategory(product.name, product.ingredients);
  const measures: SkinMeasureId[] = [];

  if (text.includes('niacinamide') || text.includes('redness') || text.includes('calming') || text.includes('centella')) {
    measures.push('barrier');
  }
  if (
    text.includes('vitamin c') ||
    text.includes('retinol') ||
    text.includes('retinoid') ||
    text.includes('peptide') ||
    text.includes('tone') ||
    text.includes('brighten')
  ) {
    measures.push('aging');
  }
  if (
    text.includes('salicylic') ||
    text.includes('bha') ||
    text.includes('benzoyl') ||
    text.includes('acne') ||
    text.includes('spot')
  ) {
    measures.push('acne');
  }
  if (text.includes('aha') || text.includes('glycolic') || text.includes('exfoliat') || text.includes('pore')) {
    measures.push('texture');
  }
  if (text.includes('oil') || text.includes('matte') || text.includes('sebum')) {
    measures.push('oiliness');
  }
  if (
    text.includes('moistur') ||
    text.includes('hydrat') ||
    text.includes('hyaluronic') ||
    text.includes('ceramide') ||
    category === 'moisturizer'
  ) {
    measures.push('hydration');
  }
  if (text.includes('texture') || text.includes('smooth')) {
    measures.push('texture');
  }

  if (measures.length === 0) {
    const byCategory: Record<ProductCategory, SkinMeasureId> = {
      moisturizer: 'hydration',
      cleanser: 'acne',
      serum: 'texture',
      spf: 'aging',
      other: 'hydration',
    };
    measures.push(byCategory[category]);
  }

  return [...new Set(measures)].slice(0, 2);
}

/** Actives go on trial; daily staples stay in routine */
export function shelfRoleForProduct(product: ShelfProduct): ShelfRole {
  const text = `${product.name} ${product.brand ?? ''} ${product.ingredients.join(' ')}`.toLowerCase();
  const category = guessCategory(product.name, product.ingredients);

  if (
    text.includes('retinol') ||
    text.includes('retinoid') ||
    text.includes('niacinamide') ||
    text.includes('vitamin c') ||
    text.includes('ascorbic') ||
    text.includes('peptide') ||
    text.includes('aha') ||
    text.includes('bha') ||
    text.includes('glycolic') ||
    text.includes('salicylic') ||
    text.includes('benzoyl') ||
    text.includes('serum') ||
    text.includes('treatment') ||
    text.includes('acid') ||
    category === 'serum'
  ) {
    return 'trial';
  }

  // Moisturizer can be on a short trial if it's the only tracked item; default routine for cleanser/spf
  if (category === 'cleanser' || category === 'spf') return 'routine';
  if (text.includes('lip') || text.includes('balm')) return 'routine';

  // Default moisturizers / other → trial so they show progress like the mock
  if (category === 'moisturizer') return 'trial';
  return 'routine';
}

export function trialLengthForProduct(product: ShelfProduct): number {
  if (product.trial_days != null && product.trial_days > 0) {
    return product.trial_days;
  }
  const text = `${product.name} ${product.ingredients.join(' ')}`.toLowerCase();
  if (text.includes('retinol') || text.includes('retinoid')) return 56;
  if (
    text.includes('niacinamide') ||
    text.includes('vitamin c') ||
    text.includes('serum') ||
    text.includes('peptide') ||
    text.includes('acid')
  ) {
    return 28;
  }
  return 14;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function scoreForMeasure(scan: ScanDetail, measureId: SkinMeasureId): number | null {
  const measures = buildSkinMeasures(scan.conditions ?? []);
  const match = measures.find((m) => m.id === measureId);
  if (!match) {
    return Math.round((scan.overall_score / 10) * 10) / 10;
  }
  return Math.round((match.healthScore / 10) * 10) / 10;
}

export interface MeasureSeriesPoint {
  scannedAt: string;
  day: number;
  score: number;
}

export interface MeasureSeries {
  id: SkinMeasureId;
  label: string;
  points: MeasureSeriesPoint[];
  start: number | null;
  latest: number | null;
  delta: number | null;
}

const ALL_MEASURES: SkinMeasureId[] = [
  'hydration',
  'barrier',
  'acne',
  'oiliness',
  'texture',
  'aging',
];

/** Per-measure score series from product start through the trial window */
export function buildTrialMeasureSeries(
  product: ShelfProduct,
  history: ScanDetail[],
  trialDays?: number,
): MeasureSeries[] {
  const started = new Date(product.created_at);
  const length = trialDays ?? trialLengthForProduct(product);
  const end = new Date(started);
  end.setDate(end.getDate() + length);

  const scans = history
    .filter((scan) => {
      const at = new Date(scan.scanned_at);
      return at >= started && at <= end;
    })
    .sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime());

  const targets = new Set(targetMeasuresForProduct(product));

  return ALL_MEASURES.map((id) => {
    const points: MeasureSeriesPoint[] = scans.map((scan) => {
      const score = scoreForMeasure(scan, id) ?? Math.round((scan.overall_score / 10) * 10) / 10;
      return {
        scannedAt: scan.scanned_at,
        day: Math.min(length, Math.max(1, daysBetween(started, new Date(scan.scanned_at)) + 1)),
        score,
      };
    });
    const start = points.length > 0 ? points[0].score : null;
    const latest = points.length > 0 ? points[points.length - 1].score : null;
    const delta =
      start != null && latest != null ? Math.round((latest - start) * 10) / 10 : null;
    return {
      id,
      label: MEASURE_LIST_LABEL[id],
      points,
      start,
      latest,
      delta,
    };
  }).sort((a, b) => {
    const aTarget = targets.has(a.id) ? 1 : 0;
    const bTarget = targets.has(b.id) ? 1 : 0;
    if (aTarget !== bTarget) return bTarget - aTarget;
    return 0;
  });
}

export function buildOverallTrialSeries(
  product: ShelfProduct,
  history: ScanDetail[],
  trialDays?: number,
): MeasureSeriesPoint[] {
  const started = new Date(product.created_at);
  const length = trialDays ?? trialLengthForProduct(product);
  const end = new Date(started);
  end.setDate(end.getDate() + length);

  return history
    .filter((scan) => {
      const at = new Date(scan.scanned_at);
      return at >= started && at <= end;
    })
    .sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime())
    .map((scan) => ({
      scannedAt: scan.scanned_at,
      day: Math.min(length, Math.max(1, daysBetween(started, new Date(scan.scanned_at)) + 1)),
      score: Math.round((scan.overall_score / 10) * 10) / 10,
    }));
}

function statusFor(
  day: number,
  trialDays: number,
  delta: number | null,
  scanCount: number,
): { status: TrackingStatus; statusLabel: string } {
  // Negative movement → check this
  if (delta != null && delta <= -0.4 && scanCount >= 2) {
    return { status: 'check_this', statusLabel: 'CHECK THIS' };
  }
  // Clear positive movement
  if (delta != null && delta >= 0.4 && scanCount >= 2) {
    if (day >= Math.floor(trialDays * 0.7)) {
      return { status: 'working', statusLabel: 'WORKING' };
    }
    return { status: 'on_track', statusLabel: 'ON TRACK' };
  }
  // Near end with no clear win
  if (day >= trialDays && (delta == null || Math.abs(delta) < 0.4)) {
    return { status: 'check_this', statusLabel: 'CHECK THIS' };
  }
  return { status: 'on_track', statusLabel: 'ON TRACK' };
}

export function buildProductTracking(
  product: ShelfProduct,
  history: ScanDetail[],
  now = new Date(),
): ProductTracking {
  const started = new Date(product.created_at);
  const day = Math.max(1, daysBetween(started, now) + 1);
  const trackingEnabled = product.tracking_enabled !== false;
  const role: ShelfRole = trackingEnabled ? 'trial' : 'routine';
  const trialDays = trackingEnabled ? trialLengthForProduct(product) : 1;
  const targetMeasures = targetMeasuresForProduct(product);
  const primaryMeasure = targetMeasures[0];
  const targetLabel = targetMeasures.map((id) => MEASURE_LIST_LABEL[id]).join(', ');

  const sinceStart = history
    .filter((scan) => new Date(scan.scanned_at) >= started)
    .sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime());

  const scoreSeries = sinceStart
    .map((scan) => scoreForMeasure(scan, primaryMeasure))
    .filter((s): s is number => s != null);

  const startScore = scoreSeries.length > 0 ? scoreSeries[0] : null;
  const latestScore = scoreSeries.length > 0 ? scoreSeries[scoreSeries.length - 1] : null;
  const delta =
    startScore != null && latestScore != null
      ? Math.round((latestScore - startScore) * 10) / 10
      : null;

  const { status, statusLabel } = trackingEnabled
    ? statusFor(day, trialDays, delta, scoreSeries.length)
    : { status: 'on_track' as const, statusLabel: 'ON SHELF' };
  const progress = trackingEnabled ? Math.min(1, day / trialDays) : 0;

  const checkInReady =
    trackingEnabled && day >= Math.min(14, trialDays) && scoreSeries.length >= 2;

  let checkInCopy: string | null = null;
  if (checkInReady && startScore != null && latestScore != null) {
    const primaryLabel = MEASURE_LIST_LABEL[primaryMeasure].toLowerCase();
    const direction =
      delta != null && delta >= 0.3
        ? "It's working — keep going."
        : delta != null && delta <= -0.3
          ? 'Results are slipping — review this trial.'
          : 'Still early to call it — stay consistent.';
    checkInCopy = `Your ${primaryLabel} went from ${startScore.toFixed(1)} → ${latestScore.toFixed(1)} across ${scoreSeries.length} scan${scoreSeries.length === 1 ? '' : 's'}. ${direction}`;
  }

  return {
    product,
    role,
    day: Math.min(day, trialDays),
    trialDays,
    targetMeasures,
    targetLabel,
    status,
    statusLabel,
    scoreSeries,
    startScore,
    latestScore,
    delta,
    scanCount: scoreSeries.length,
    checkInReady,
    checkInCopy,
    progress,
    aiSummary: null,
    aiAdvice: null,
  };
}

export function applyTrackingInsights(
  trackingList: ProductTracking[],
  insights: Array<{
    product_id: string;
    status: TrackingStatus;
    status_label: string;
    summary: string;
    advice?: string | null;
  }>,
): ProductTracking[] {
  if (!insights.length) return trackingList;
  const byId = new Map(insights.map((i) => [i.product_id, i]));
  return trackingList.map((item) => {
    const insight = byId.get(item.product.id);
    if (!insight || item.product.tracking_enabled === false) return item;
    return {
      ...item,
      status: insight.status,
      statusLabel: insight.status_label,
      checkInCopy: insight.summary,
      aiSummary: insight.summary,
      aiAdvice: insight.advice ?? null,
    };
  });
}

export function trackingProgressLabel(tracking: ProductTracking): string {
  if (tracking.product.tracking_enabled === false) {
    return 'Not tracking';
  }
  if (tracking.delta != null) {
    const sign = tracking.delta >= 0 ? '+' : '';
    const label = MEASURE_LIST_LABEL[tracking.targetMeasures[0]];
    return `${label} ${sign}${tracking.delta.toFixed(1)} since start`;
  }
  return `Day ${tracking.day} of ${tracking.trialDays}`;
}

export function categoryIcon(category: ProductCategory): string {
  switch (category) {
    case 'moisturizer':
      return '💧';
    case 'serum':
      return '🧪';
    case 'cleanser':
      return '🫧';
    case 'spf':
      return '☀';
    default:
      return '✦';
  }
}

export function routineShortLabel(product: ShelfProduct): string {
  const category = guessCategory(product.name, product.ingredients);
  const text = product.name.toLowerCase();
  if (text.includes('lip')) return 'Lip balm';
  if (category === 'spf') {
    const spf = product.name.match(/spf\s*\d+/i);
    return spf ? spf[0].toUpperCase() : 'SPF';
  }
  if (category === 'cleanser') return 'Cleanser';
  if (category === 'moisturizer') return 'Moisturizer';
  if (category === 'serum') return 'Serum';
  return product.name.split(' ').slice(0, 2).join(' ');
}
