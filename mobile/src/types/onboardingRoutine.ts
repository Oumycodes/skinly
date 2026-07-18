import type { ProductCategory } from '../utils/productCategory';

export type RoutinePeriod = 'morning' | 'night' | 'both';

export interface OnboardingRoutineProduct {
  id: string;
  name: string;
  brand?: string;
  category: ProductCategory;
  period: RoutinePeriod;
  daysPerWeek: number;
  imageUrl?: string | null;
  shelfId?: string | null;
}

export function createRoutineProduct(
  name: string,
  brand?: string,
  imageUrl?: string | null,
  shelfId?: string | null,
): OnboardingRoutineProduct {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    brand: brand?.trim() || undefined,
    category: 'other',
    period: 'both',
    daysPerWeek: 7,
    imageUrl: imageUrl ?? null,
    shelfId: shelfId ?? null,
  };
}

export function isRoutineProductArray(value: unknown): value is OnboardingRoutineProduct[] {
  return Array.isArray(value) && value.every((item) => item && typeof item.name === 'string');
}

export function periodLabel(period: RoutinePeriod): string {
  if (period === 'morning') return 'Morning';
  if (period === 'night') return 'Night';
  return 'Morning & night';
}
