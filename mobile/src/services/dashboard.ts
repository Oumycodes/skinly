import { apiFetch } from './api';

export interface DashboardMetric {
  id: string;
  value: string;
  label: string;
  progress: number;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface DashboardData {
  skin_score: number;
  weekly_change: number;
  streak: number;
  metrics: DashboardMetric[];
  latest_scan_at: string | null;
}

export async function getDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>('/scan/dashboard');
}
