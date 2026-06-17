import { useCallback, useEffect, useState } from 'react';

import {
  buildRoutine,
  getRoutine,
  saveRoutine,
  type Period,
  type RoutineStep,
  type UserRoutine,
} from '../services/routine';

export function useRoutine(period: Period) {
  const [routine, setRoutine] = useState<UserRoutine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRoutine(await getRoutine(period));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routine');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const autoBuild = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const built = await buildRoutine(period);
      setRoutine(built);
      return built;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-build failed');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [period]);

  const save = useCallback(
    async (steps: RoutineStep[]) => {
      setSaving(true);
      setError(null);
      try {
        const saved = await saveRoutine(period, steps);
        setRoutine(saved);
        return saved;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [period],
  );

  return { routine, loading, saving, error, refresh, autoBuild, save, setRoutine };
}
