import { apiFetch } from './api';

import type { ScanAngle, SkinCondition } from './scan';

export interface ScanImageUrls {
  front: string | null;
  left: string | null;
  right: string | null;
}

export interface DashboardMetric {
  id: string;
  value: string;
  label: string;
  progress: number;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface MetricPriority {
  metric: string;
  why: string;
  suggestion: string;
}

export interface MetricInsight {
  id: string;
  label: string;
  score: number;
  evidence?: string | null;
  confidence?: string | null;
  zones_affected?: string[];
  suggestion?: string | null;
  why?: string | null;
}

export interface DashboardData {
  skin_score: number;
  weekly_change: number;
  streak: number;
  metrics: DashboardMetric[];
  latest_scan_at: string | null;
  latest_scan_summary: string | null;
  latest_scan_image_url: string | null;
  latest_scan_image_urls: ScanImageUrls;
  latest_scan_conditions: SkinCondition[];
  latest_metrics_smoothed?: Record<string, number>;
  latest_metric_insights?: MetricInsight[];
  latest_priorities?: MetricPriority[];
  latest_trend_note?: string | null;
}

export interface ScanDetail {
  scan_id: string;
  overall_score: number;
  summary: string;
  conditions: SkinCondition[];
  scanned_at: string;
  image_urls: ScanImageUrls;
  metrics_smoothed?: Record<string, number>;
  metric_insights?: MetricInsight[];
  priorities?: MetricPriority[];
  trend_note?: string | null;
  zone_summaries?: Record<string, string>;
}

export function scanDetailImages(detail: ScanDetail): Partial<Record<ScanAngle, string>> {
  const urls = detail.image_urls;
  const images: Partial<Record<ScanAngle, string>> = {};
  if (urls.front) images.front = urls.front;
  if (urls.left) images.left = urls.left;
  if (urls.right) images.right = urls.right;
  return images;
}

export function dashboardImages(data: DashboardData): Partial<Record<ScanAngle, string>> {
  const urls = data.latest_scan_image_urls;
  const images: Partial<Record<ScanAngle, string>> = {};
  if (urls.front) images.front = urls.front;
  if (urls.left) images.left = urls.left;
  if (urls.right) images.right = urls.right;
  if (!images.front && data.latest_scan_image_url) {
    images.front = data.latest_scan_image_url;
  }
  return images;
}

export async function getDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/scan/dashboard');
}

export async function getScanHistoryDetail(limit = 30): Promise<ScanDetail[]> {
  return apiFetch<ScanDetail[]>(`/scan/history/detail?limit=${limit}`);
}

export async function getScanByDate(date: string): Promise<ScanDetail> {
  return apiFetch<ScanDetail>(`/scan/by-date?date=${date}`);
}
