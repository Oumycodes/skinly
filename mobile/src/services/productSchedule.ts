import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Per-product weekly schedule (which days you use each product), stored on the
 * device. Weekday indices follow JS `Date.getDay()`: 0 = Sunday … 6 = Saturday.
 */
export type WeekdaySchedule = number[];

const KEY = '@skins/product_schedule';

let cache: Record<string, WeekdaySchedule> | null = null;

async function load(): Promise<Record<string, WeekdaySchedule>> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, WeekdaySchedule>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

export async function getProductSchedules(): Promise<Record<string, WeekdaySchedule>> {
  return { ...(await load()) };
}

export async function setProductSchedule(
  productId: string,
  days: WeekdaySchedule,
): Promise<void> {
  const all = await load();
  all[productId] = days;
  cache = { ...all };
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}

export async function removeProductSchedule(productId: string): Promise<void> {
  const all = await load();
  if (productId in all) {
    delete all[productId];
    cache = { ...all };
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  }
}

/** Reactive access; call refresh() after a schedule changes elsewhere. */
export function useProductSchedules() {
  const [schedules, setSchedules] = useState<Record<string, WeekdaySchedule>>(
    cache ?? {},
  );
  const [loading, setLoading] = useState(cache == null);

  const refresh = useCallback(async () => {
    setSchedules(await getProductSchedules());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { schedules, loading, refresh };
}
