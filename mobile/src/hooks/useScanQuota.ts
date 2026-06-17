import { useCallback, useEffect, useState } from 'react';

import { getScanQuota, type ScanQuota } from '../services/scan';

export function useScanQuota() {
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getScanQuota();
      setQuota(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan quota');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { quota, loading, error, refresh };
}
