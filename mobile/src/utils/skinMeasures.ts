import type { ProductRecommendation, Severity, SkinCondition } from '../services/scan';

export type ScanAngle = 'front' | 'left' | 'right';

export const SCAN_ANGLES: ScanAngle[] = ['front', 'left', 'right'];

export const SCAN_ANGLE_LABEL: Record<ScanAngle, string> = {
  front: 'Front',
  left: 'Left',
  right: 'Right',
};

export type SkinMeasureId =
  | 'hydration'
  | 'oiliness'
  | 'acne'
  | 'barrier'
  | 'aging'
  | 'texture';

export interface FocusRegion {
  /** Normalized center X (0–1) on the face photo */
  cx: number;
  /** Normalized center Y (0–1) on the face photo */
  cy: number;
  /** Zoom scale when this measure is selected */
  scale: number;
  /** Highlight ellipse width as fraction of image width */
  rx: number;
  /** Highlight ellipse height as fraction of image height */
  ry: number;
}

export interface AngleFaceConfig {
  baseZoom: number;
  /** Vertical crop offset as fraction of scaled image height */
  topCrop: number;
  /** Horizontal centering — 0.5 = centered */
  hCenter: number;
}

export interface SkinMeasure {
  id: SkinMeasureId;
  icon: string;
  title: string;
  status: 'good' | Severity;
  statusLabel: string;
  brief: string;
  detail: string;
  healthScore: number;
  recommendations: ProductRecommendation[];
  tips: string[];
}

const MEASURE_META: Record<
  SkinMeasureId,
  { icon: string; title: string; keywords: string[]; goodBrief: string; goodDetail: string; goodTips: string[] }
> = {
  hydration: {
    icon: '💧',
    title: 'Hydration',
    keywords: ['dehydration', 'hydration', 'dry', 'moisture', 'dull'],
    goodBrief: 'Your skin looks well hydrated with a healthy glow.',
    goodDetail: 'Water content and lipids appear balanced. Keep up your moisturizer and drink plenty of water.',
    goodTips: ['Use a hyaluronic acid serum', 'Apply moisturizer on damp skin', 'Avoid over-cleansing'],
  },
  oiliness: {
    icon: '🛢️',
    title: 'Oiliness (Sebum)',
    keywords: ['oil', 'oily', 'sebum', 'shine', 'greasy'],
    goodBrief: 'Sebum levels look balanced — not too dry, not too oily.',
    goodDetail: 'Your skin is maintaining a healthy oil balance across the T-zone and cheeks.',
    goodTips: ['Use a lightweight gel moisturizer', 'Blot excess oil midday if needed', 'Do not skip moisturizer'],
  },
  acne: {
    icon: '😖',
    title: 'Acne',
    keywords: ['acne', 'blemish', 'breakout', 'pimple', 'congestion', 'blackhead'],
    goodBrief: 'No significant breakouts detected.',
    goodDetail: 'Pores look clear with minimal active blemishes. Your current routine seems to be working.',
    goodTips: ['Cleanse after sweating', 'Change pillowcases weekly', 'Avoid picking at skin'],
  },
  barrier: {
    icon: '🛡️',
    title: 'Skin Barrier Health',
    keywords: ['barrier', 'sensitivity', 'redness', 'irritation', 'inflam'],
    goodBrief: 'Your skin barrier appears strong and resilient.',
    goodDetail: 'Low signs of irritation or sensitivity. Your barrier is doing its job protecting against moisture loss.',
    goodTips: ['Use ceramide-rich products', 'Introduce actives slowly', 'Always wear SPF'],
  },
  aging: {
    icon: '👵',
    title: 'Aging (Wrinkles & Elasticity)',
    keywords: ['wrinkle', 'aging', 'elasticity', 'fine line', 'sagging', 'firmness', 'hyperpigmentation', 'spot', 'tone'],
    goodBrief: 'Skin looks firm with minimal visible lines.',
    goodDetail: 'Elasticity and texture appear healthy for your age. Prevention with SPF and antioxidants is key.',
    goodTips: ['Wear SPF 30+ daily', 'Consider retinol at night', 'Use vitamin C in the morning'],
  },
  texture: {
    icon: '✨',
    title: 'Skin Texture',
    keywords: ['texture', 'pore', 'rough', 'bumpy', 'smoothness', 'enlarged pore'],
    goodBrief: 'Skin texture looks smooth and even.',
    goodDetail: 'Pores appear refined with an even surface. Gentle exfoliation and hydration help maintain this.',
    goodTips: ['Use a BHA exfoliant 2–3× weekly', 'Do not over-exfoliate', 'Keep skin moisturized'],
  },
};

const ORDER: SkinMeasureId[] = [
  'hydration',
  'oiliness',
  'acne',
  'barrier',
  'aging',
  'texture',
];

/** Home-screen list labels (positive-framed pipeline metrics) */
export const MEASURE_LIST_LABEL: Record<SkinMeasureId, string> = {
  hydration: 'Hydration',
  oiliness: 'Oil balance',
  acne: 'Clarity',
  barrier: 'Calmness',
  aging: 'Fine lines',
  texture: 'Texture',
};

/** Front-facing focus zones */
export const MEASURE_FOCUS: Record<SkinMeasureId, FocusRegion> = {
  hydration: { cx: 0.5, cy: 0.19, scale: 3.6, rx: 0.065, ry: 0.065 },
  oiliness: { cx: 0.5, cy: 0.42, scale: 3.4, rx: 0.065, ry: 0.065 },
  acne: { cx: 0.72, cy: 0.55, scale: 3.8, rx: 0.06, ry: 0.06 },
  barrier: { cx: 0.28, cy: 0.52, scale: 3.7, rx: 0.06, ry: 0.06 },
  aging: { cx: 0.5, cy: 0.31, scale: 3.3, rx: 0.07, ry: 0.07 },
  texture: { cx: 0.62, cy: 0.48, scale: 3.5, rx: 0.065, ry: 0.065 },
};

/** Per-angle focus — profile views highlight cheek, jaw, eye areas */
export const MEASURE_FOCUS_BY_ANGLE: Record<ScanAngle, Record<SkinMeasureId, FocusRegion>> = {
  front: MEASURE_FOCUS,
  left: {
    hydration: { cx: 0.52, cy: 0.2, scale: 3.5, rx: 0.065, ry: 0.065 },
    oiliness: { cx: 0.48, cy: 0.44, scale: 3.3, rx: 0.065, ry: 0.065 },
    acne: { cx: 0.58, cy: 0.56, scale: 3.7, rx: 0.06, ry: 0.06 },
    barrier: { cx: 0.55, cy: 0.5, scale: 3.6, rx: 0.06, ry: 0.06 },
    aging: { cx: 0.45, cy: 0.34, scale: 3.2, rx: 0.07, ry: 0.07 },
    texture: { cx: 0.58, cy: 0.46, scale: 3.4, rx: 0.065, ry: 0.065 },
  },
  right: {
    hydration: { cx: 0.48, cy: 0.2, scale: 3.5, rx: 0.065, ry: 0.065 },
    oiliness: { cx: 0.52, cy: 0.44, scale: 3.3, rx: 0.065, ry: 0.065 },
    acne: { cx: 0.42, cy: 0.56, scale: 3.7, rx: 0.06, ry: 0.06 },
    barrier: { cx: 0.45, cy: 0.5, scale: 3.6, rx: 0.06, ry: 0.06 },
    aging: { cx: 0.55, cy: 0.34, scale: 3.2, rx: 0.07, ry: 0.07 },
    texture: { cx: 0.42, cy: 0.46, scale: 3.4, rx: 0.065, ry: 0.065 },
  },
};

/** Default crop per camera angle */
export const ANGLE_FACE_CONFIG: Record<ScanAngle, AngleFaceConfig> = {
  front: { baseZoom: 1.78, topCrop: 0.22, hCenter: 0.5 },
  left: { baseZoom: 1.55, topCrop: 0.18, hCenter: 0.5 },
  right: { baseZoom: 1.55, topCrop: 0.18, hCenter: 0.5 },
};

/** Best angle to inspect each measure — auto-switch when selected */
export const MEASURE_PREFERRED_ANGLE: Record<SkinMeasureId, ScanAngle> = {
  hydration: 'front',
  oiliness: 'front',
  acne: 'right',
  barrier: 'left',
  aging: 'front',
  texture: 'front',
};

export function getMeasureFocus(angle: ScanAngle, measureId: SkinMeasureId): FocusRegion {
  return MEASURE_FOCUS_BY_ANGLE[angle][measureId];
}

const SEVERITY_SCORE: Record<Severity, number> = {
  mild: 72,
  moderate: 48,
  severe: 28,
};

const STATUS_LABEL: Record<Severity, string> = {
  mild: 'Mild concern',
  moderate: 'Moderate',
  severe: 'Needs attention',
};

/** Two extra shelf picks per measure — appended for any non-good score */
const MEASURE_EXTRA_RECOMMENDATIONS: Record<SkinMeasureId, ProductRecommendation[]> = {
  hydration: [
    {
      name: 'Hyaluronic Acid 2% + B5',
      brand: 'The Ordinary',
      reason: 'It may help with pulling water into the skin and easing tightness from dehydration.',
      affiliate_url: 'https://skins.app/shop/the-ordinary-ha-b5',
      image_url: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=240&h=240&fit=crop',
    },
    {
      name: 'Water Sleeping Mask',
      brand: 'Laneige',
      reason: 'It may help with overnight moisture recovery and reviving dull, thirsty-looking skin.',
      affiliate_url: 'https://skins.app/shop/laneige-sleeping-mask',
      image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=240&h=240&fit=crop',
    },
  ],
  oiliness: [
    {
      name: 'Effaclar Purifying Foaming Gel',
      brand: 'La Roche-Posay',
      reason: 'It may help with balancing excess sebum without leaving skin feeling stripped.',
      affiliate_url: 'https://skins.app/shop/lrp-effaclar-gel',
      image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=240&h=240&fit=crop',
    },
    {
      name: '2% BHA Liquid Exfoliant',
      brand: "Paula's Choice",
      reason: 'It may help with clearing clogged pores and reducing shine across the T-zone.',
      affiliate_url: 'https://skins.app/shop/paulas-choice-bha',
      image_url: 'https://images.unsplash.com/photo-1608248543801-ba977f7cb8fd?w=240&h=240&fit=crop',
    },
  ],
  acne: [
    {
      name: 'Acne Foaming Cream Cleanser',
      brand: 'CeraVe',
      reason: 'It may help with clearing active breakouts thanks to 4% benzoyl peroxide.',
      affiliate_url: 'https://skins.app/shop/cerave-acne-cleanser',
      image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=240&h=240&fit=crop',
    },
    {
      name: 'Succinic Acid Acne Treatment',
      brand: 'The INKEY List',
      reason: 'It may help with calming inflamed spots and preventing new blemishes from forming.',
      affiliate_url: 'https://skins.app/shop/inkey-succinic-acid',
      image_url: 'https://images.unsplash.com/photo-1620916560425-325fe040e167?w=240&h=240&fit=crop',
    },
  ],
  barrier: [
    {
      name: 'Great Barrier Relief',
      brand: 'Krave Beauty',
      reason: 'It may help with calming redness and strengthening a stressed skin barrier.',
      affiliate_url: 'https://skins.app/shop/krave-barrier-relief',
      image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=240&h=240&fit=crop',
    },
    {
      name: 'Calm + Restore Oat Serum',
      brand: 'Aveeno',
      reason: 'It may help with soothing irritation and reducing visible redness on cheeks.',
      affiliate_url: 'https://skins.app/shop/aveeno-oat-serum',
      image_url: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=240&h=240&fit=crop',
    },
  ],
  aging: [
    {
      name: 'Rapid Wrinkle Repair Retinol',
      brand: 'Neutrogena',
      reason: 'It may help with softening fine lines and improving firmness over time.',
      affiliate_url: 'https://skins.app/shop/neutrogena-retinol',
      image_url: 'https://images.unsplash.com/photo-1608248543801-ba977f7cb8fd?w=240&h=240&fit=crop',
    },
    {
      name: '10% Niacinamide Booster',
      brand: "Paula's Choice",
      reason: 'It may help with evening skin tone and fading the look of dark spots.',
      affiliate_url: 'https://skins.app/shop/paulas-choice-niacinamide',
      image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=240&h=240&fit=crop',
    },
  ],
  texture: [
    {
      name: 'BHA Blackhead Power Liquid',
      brand: 'COSRX',
      reason: 'It may help with smoothing rough texture and refining enlarged pores.',
      affiliate_url: 'https://skins.app/shop/cosrx-bha',
      image_url: 'https://images.unsplash.com/photo-1620916560425-325fe040e167?w=240&h=240&fit=crop',
    },
    {
      name: 'AHA 30% + BHA 2% Peeling Solution',
      brand: 'The Ordinary',
      reason: 'It may help with gently resurfacing uneven, bumpy skin for a smoother finish.',
      affiliate_url: 'https://skins.app/shop/the-ordinary-peeling',
      image_url: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=240&h=240&fit=crop',
    },
  ],
};

function mergeRecommendations(
  primary: ProductRecommendation[],
  extras: ProductRecommendation[],
): ProductRecommendation[] {
  const seen = new Set<string>();
  const merged: ProductRecommendation[] = [];

  for (const product of [...primary, ...extras]) {
    const key = `${product.brand}-${product.name}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(product);
  }

  return merged;
}

function matchesMeasure(conditionName: string, keywords: string[]): boolean {
  const lower = conditionName.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function buildGoodMeasure(id: SkinMeasureId): SkinMeasure {
  const meta = MEASURE_META[id];
  return {
    id,
    icon: meta.icon,
    title: meta.title,
    status: 'good',
    statusLabel: 'Good',
    brief: meta.goodBrief,
    detail: meta.goodDetail,
    // No fake "8.8" — only show a score when we have pipeline data
    healthScore: 0,
    recommendations: [],
    tips: meta.goodTips,
  };
}

function buildConcernMeasure(id: SkinMeasureId, condition: SkinCondition): SkinMeasure {
  const meta = MEASURE_META[id];
  return {
    id,
    icon: meta.icon,
    title: meta.title,
    status: condition.severity,
    statusLabel: STATUS_LABEL[condition.severity],
    brief: condition.explanation.split('.')[0] + '.',
    detail: condition.explanation,
    healthScore: SEVERITY_SCORE[condition.severity],
    recommendations: mergeRecommendations(
      condition.recommendations,
      MEASURE_EXTRA_RECOMMENDATIONS[id],
    ),
    tips: meta.goodTips,
  };
}

export function buildSkinMeasures(conditions: SkinCondition[]): SkinMeasure[] {
  const used = new Set<string>();

  return ORDER.map((id) => {
    const meta = MEASURE_META[id];
    const match = conditions.find(
      (c) => !used.has(c.name) && matchesMeasure(c.name, meta.keywords),
    );

    if (match) {
      used.add(match.name);
      return buildConcernMeasure(id, match);
    }

    return buildGoodMeasure(id);
  });
}

/** Map pipeline metric ids → SkinMeasure ids used by existing UI. */
const PIPELINE_TO_MEASURE: Record<string, SkinMeasureId> = {
  hydration: 'hydration',
  oil_balance: 'oiliness',
  clarity: 'acne',
  calmness: 'barrier',
  fine_lines: 'aging',
  smoothness: 'texture',
};

export interface PipelineMetricInsightInput {
  id: string;
  label: string;
  score: number;
  evidence?: string | null;
  suggestion?: string | null;
  why?: string | null;
  why_now?: string | null;
  confidence?: string | null;
}

function statusFromScore10(score: number): {
  status: SkinMeasure['status'];
  statusLabel: string;
} {
  if (score >= 7.5) return { status: 'good', statusLabel: 'Looking good' };
  if (score >= 6) return { status: 'mild', statusLabel: 'Mild focus' };
  if (score >= 4.5) return { status: 'moderate', statusLabel: 'Needs care' };
  return { status: 'severe', statusLabel: 'Priority' };
}

/**
 * Build Home/Progress measure cards from the latest pipeline scan.
 * Scores always prefer metrics_smoothed (last detected); insights add evidence/tips.
 */
export function buildMeasuresFromInsights(
  insights: PipelineMetricInsightInput[],
  fallbackConditions: SkinCondition[] = [],
  smoothedScores?: Record<string, number> | null,
): SkinMeasure[] {
  const byMeasure = new Map<SkinMeasureId, PipelineMetricInsightInput>();

  for (const insight of insights) {
    const mid = PIPELINE_TO_MEASURE[insight.id];
    if (mid) byMeasure.set(mid, { ...insight });
  }

  // Authoritative last-scan scores — overlay / fill every metric
  if (smoothedScores && Object.keys(smoothedScores).length > 0) {
    for (const [pipelineId, measureId] of Object.entries(PIPELINE_TO_MEASURE)) {
      const raw = smoothedScores[pipelineId];
      if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
      const score = raw > 10 ? raw / 10 : raw;
      const existing = byMeasure.get(measureId);
      byMeasure.set(measureId, {
        id: pipelineId,
        label: existing?.label ?? MEASURE_LIST_LABEL[measureId],
        score,
        evidence: existing?.evidence,
        suggestion: existing?.suggestion,
        why: existing?.why,
        why_now: existing?.why_now,
        confidence: existing?.confidence,
      });
    }
  }

  if (byMeasure.size === 0) {
    return buildSkinMeasures(fallbackConditions);
  }

  return ORDER.map((id) => {
    const meta = MEASURE_META[id];
    const insight = byMeasure.get(id);
    if (!insight || typeof insight.score !== 'number' || !Number.isFinite(insight.score)) {
      return buildGoodMeasure(id);
    }

    const score10 = insight.score <= 10 ? insight.score : insight.score / 10;
    const { status, statusLabel } = statusFromScore10(score10);
    const evidence = (insight.evidence || '').trim();
    const suggestion = (insight.suggestion || '').trim();
    const whyNow = (insight.why || insight.why_now || '').trim();

    const brief =
      evidence ||
      (status === 'good' ? meta.goodBrief : `${MEASURE_LIST_LABEL[id]} could use a little attention.`);

    const detailParts = [
      whyNow ? whyNow : '',
      suggestion ? suggestion : '',
    ].filter(Boolean);

    return {
      id,
      icon: meta.icon,
      title: MEASURE_LIST_LABEL[id],
      status,
      statusLabel,
      brief,
      // Extra copy only — evidence lives in `brief` (no duplicate in suggestions)
      detail: detailParts.join('\n\n'),
      // healthScore is 0–100 so UI can show X.Y via /10
      healthScore: Math.max(1, Math.round(score10 * 10)),
      // Only recommend products when the metric actually needs help (< 7)
      recommendations: score10 < 7 ? MEASURE_EXTRA_RECOMMENDATIONS[id] ?? [] : [],
      tips: suggestion ? [suggestion, ...meta.goodTips.slice(0, 2)] : meta.goodTips,
    };
  });
}

export function getPrimaryConcerns(measures: SkinMeasure[]): SkinMeasure[] {
  return measures.filter((m) => m.status !== 'good');
}
