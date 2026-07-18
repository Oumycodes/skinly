import { apiFetch } from './api';

export type Severity = 'mild' | 'moderate' | 'severe';

export type ScanAngle = 'front' | 'left' | 'right';

export type ScanImages = Record<ScanAngle, string>;

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

export type ScanMetricId =
  | 'dryness'
  | 'oiliness'
  | 'acne'
  | 'redness'
  | 'fine_lines'
  | 'texture';

export interface ScanMetric {
  id: ScanMetricId;
  label: string;
  score: number;
  regions: MetricRegion[];
}

export interface ScanResult {
  scan_id: string;
  overall_score: number;
  summary: string;
  conditions: SkinCondition[];
  metrics?: ScanMetric[];
  scanned_at: string;
  image_urls?: Partial<Record<ScanAngle, string | null>> | null;
}

export interface ScanQuota {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
}

export async function getScanQuota(): Promise<ScanQuota> {
  return apiFetch<ScanQuota>('/scan/quota');
}

function appendImage(formData: FormData, field: ScanAngle, uri: string) {
  formData.append(field, {
    uri,
    name: `${field}.jpg`,
    type: 'image/jpeg',
  } as unknown as Blob);
}

export async function submitScan(images: ScanImages): Promise<ScanResult> {
  const formData = new FormData();
  appendImage(formData, 'front', images.front);
  appendImage(formData, 'left', images.left);
  appendImage(formData, 'right', images.right);

  return apiFetch<ScanResult>('/scan', {
    method: 'POST',
    body: formData,
  });
}
