import { apiFetch, ApiError } from './api';
import { invalidateScanHistory } from './scanHistoryCache';

export type Severity = 'mild' | 'moderate' | 'severe';

export type ScanAngle = 'front' | 'left' | 'right';

export type ScanImages = Partial<Record<ScanAngle, string>> & { front: string };

export interface ProductRecommendation {
  name: string;
  brand: string;
  reason: string;
  affiliate_url: string;
  image_url?: string | null;
}

export interface SkinCondition {
  name: string;
  severity: Severity;
  explanation: string;
  recommendations: ProductRecommendation[];
}

export interface MetricRegion {
  x: number;
  y: number;
  r: number;
}

/** Positive-framed pipeline metrics (0–10, higher = better) */
export type PipelineMetricId =
  | 'hydration'
  | 'oil_balance'
  | 'clarity'
  | 'calmness'
  | 'smoothness'
  | 'fine_lines';

/** Legacy metric ids kept for older UI helpers */
export type ScanMetricId =
  | PipelineMetricId
  | 'dryness'
  | 'oiliness'
  | 'acne'
  | 'redness'
  | 'texture';

export interface ScanMetric {
  id: ScanMetricId;
  label: string;
  score: number;
  regions: MetricRegion[];
}

export interface PipelineFinding {
  zone: string;
  cx: number;
  cy: number;
  r: number;
  type: string;
  confidence: number;
}

export interface ZoneBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PipelineMetrics {
  hydration: number;
  oil_balance: number;
  clarity: number;
  calmness: number;
  smoothness: number;
  fine_lines: number;
}

export interface TrialLink {
  product_id: string;
  day: number;
  len: number;
}

export interface ScanResult {
  ok?: boolean;
  scan_id: string;
  overall?: number;
  overall_score: number;
  summary: string;
  metrics?: ScanMetric[] | PipelineMetrics;
  conditions: SkinCondition[];
  zones?: Record<string, ZoneBBox>;
  findings?: PipelineFinding[];
  see_professional?: boolean;
  trials?: TrialLink[];
  scanned_at: string;
  image_urls?: Partial<Record<ScanAngle, string | null>> | null;
}

export interface QCFail {
  ok: false;
  reason: string;
  message: string;
}

export interface ScanQuota {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
}

export const QC_REASON_COPY: Record<string, string> = {
  no_face: 'No face detected — align your face in the oval and try again.',
  multiple_faces: 'Only one face should be in frame.',
  too_far: 'Move closer so your face fills the oval.',
  not_frontal: 'Face the camera straight on — keep your head level.',
  too_dark: 'Find brighter light and rescan.',
  too_bright: 'Too bright — turn away from direct light.',
  blurry: 'Hold still and try again.',
  occluded: 'Remove anything covering your face and rescan.',
};

export class QCError extends Error {
  constructor(
    public reason: string,
    message: string,
  ) {
    super(message);
    this.name = 'QCError';
  }
}

export async function getScanQuota(): Promise<ScanQuota> {
  return apiFetch<ScanQuota>('/scan/quota');
}

function appendImage(formData: FormData, field: string, uri: string) {
  formData.append(field, {
    uri,
    name: `${field}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);
}

/** Stage 1 / 2a quick QC before committing to full analysis */
export async function quickScanQC(imageUri: string): Promise<void> {
  const formData = new FormData();
  appendImage(formData, 'image', imageUri);

  const headers = new Headers();
  // apiFetch sets auth; we need custom 422 handling
  try {
    await apiFetch<{ ok: boolean }>('/scan/qc', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      const reason = err.reason ?? 'no_face';
      throw new QCError(reason, err.message || QC_REASON_COPY[reason] || 'Please retake.');
    }
    throw err;
  }
}

/** Submit Face ID burst + posed front/left/right. Analysis uses all; UI uses posed. */
export async function submitHybridScan(
  burstUris: string[],
  posed: ScanImages,
  closeups?: Partial<Record<ScanAngle, string>> | null,
): Promise<ScanResult> {
  const formData = new FormData();

  burstUris.forEach((uri, index) => {
    formData.append('images', {
      uri,
      name: `burst_${index}.jpg`,
      type: 'image/jpeg',
    } as unknown as Blob);
  });

  appendImage(formData, 'front', posed.front);
  if (posed.left) appendImage(formData, 'left', posed.left);
  if (posed.right) appendImage(formData, 'right', posed.right);

  if (closeups?.front) appendImage(formData, 'closeup_front', closeups.front);
  if (closeups?.left) appendImage(formData, 'closeup_left', closeups.left);
  if (closeups?.right) appendImage(formData, 'closeup_right', closeups.right);

  const result = await apiFetch<ScanResult>('/scan', {
    method: 'POST',
    body: formData,
  });
  // New scan → Progress/Shelf history is stale; force a refetch next time.
  invalidateScanHistory();
  return result;
}

export async function submitScan(images: ScanImages): Promise<ScanResult> {
  return submitHybridScan([], images);
}

/** @deprecated Prefer submitHybridScan */
export async function submitScanBurst(frameUris: string[]): Promise<ScanResult> {
  if (frameUris.length === 0) {
    throw new Error('No frames to analyze');
  }
  return submitHybridScan(frameUris, { front: frameUris[0]! });
}
