import { apiFetch } from './api';

export type Severity = 'mild' | 'moderate' | 'severe';

export interface ProductRecommendation {
  name: string;
  brand: string;
  reason: string;
  affiliate_url: string;
}

export interface SkinCondition {
  name: string;
  severity: Severity;
  explanation: string;
  recommendations: ProductRecommendation[];
}

export interface ScanResult {
  scan_id: string;
  overall_score: number;
  summary: string;
  conditions: SkinCondition[];
  scanned_at: string;
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

export async function submitScan(imageUri: string): Promise<ScanResult> {
  const formData = new FormData();

  formData.append('image', {
    uri: imageUri,
    name: 'scan.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  return apiFetch<ScanResult>('/scan', {
    method: 'POST',
    body: formData,
  });
}
