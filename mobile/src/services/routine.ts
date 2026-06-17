import { apiFetch } from './api';

export type Period = 'AM' | 'PM';
export type RoutineStatus = 'READY' | 'INCOMPLETE';

export interface RoutineStep {
  order: number;
  product_id: string;
  product_name: string;
  brand?: string | null;
  category: string;
  reason: string;
}

export interface UserRoutine {
  period: Period;
  steps: RoutineStep[];
  status: RoutineStatus;
  updated_at?: string | null;
}

export async function getRoutine(period: Period): Promise<UserRoutine> {
  return apiFetch<UserRoutine>(`/routine?period=${period}`);
}

export async function buildRoutine(period: Period): Promise<UserRoutine> {
  return apiFetch<UserRoutine>(`/routine/build?period=${period}`, { method: 'POST' });
}

export async function saveRoutine(period: Period, steps: RoutineStep[]): Promise<UserRoutine> {
  return apiFetch<UserRoutine>('/routine', {
    method: 'POST',
    body: JSON.stringify({ period, steps }),
  });
}
