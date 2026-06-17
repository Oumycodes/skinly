import { apiFetch } from './api';

export interface ProgressCheckin {
  id: string;
  overall_score: number;
  checkin_at: string;
}

export interface ProgressWeekPoint {
  label: string;
  score: number;
}

export interface ProgressSummary {
  current_score: number;
  starting_score: number;
  total_change: number;
  weeks_active: number;
  streak: number;
  chart_points: ProgressWeekPoint[];
  checkins: ProgressCheckin[];
}

export async function getProgress(): Promise<ProgressSummary> {
  return apiFetch<ProgressSummary>('/progress');
}

export async function submitCheckin(imageUri: string): Promise<ProgressCheckin> {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'checkin.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  return apiFetch<ProgressCheckin>('/progress/checkin', {
    method: 'POST',
    body: formData,
  });
}
