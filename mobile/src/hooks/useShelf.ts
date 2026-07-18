import { useCallback, useEffect, useState } from 'react';

import {
  addToShelf,
  getConflicts,
  getShelf,
  removeFromShelf,
  type ConflictResult,
  type ProductSearchResult,
  type ProductSource,
  type ShelfProduct,
  type UsageTime,
} from '../services/products';

export type AddProductOptions = {
  trackingEnabled?: boolean;
  trialDays?: number | null;
  usageTime?: UsageTime | null;
  timesPerWeek?: number | null;
};

export function useShelf() {
  const [products, setProducts] = useState<ShelfProduct[]>([]);
  const [conflicts, setConflicts] = useState<ConflictResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const [shelf, conflictData] = await Promise.all([getShelf(), getConflicts()]);
      setProducts(shelf);
      setConflicts(conflictData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shelf');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addProduct = useCallback(
    async (
      product: ProductSearchResult,
      source: ProductSource,
      options: AddProductOptions = {},
    ) => {
      const trackingEnabled = options.trackingEnabled ?? true;
      const saved = await addToShelf({
        name: product.name,
        brand: product.brand,
        barcode: product.barcode ?? null,
        ingredients: product.ingredients,
        source,
        image_url: product.image_url ?? null,
        tracking_enabled: trackingEnabled,
        trial_days: trackingEnabled ? (options.trialDays ?? null) : null,
        usage_time: options.usageTime ?? null,
        times_per_week: options.timesPerWeek ?? null,
      });
      setProducts((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
      void refresh({ silent: true });
      return saved;
    },
    [refresh],
  );

  const addRecommendation = useCallback(
    async (product: {
      name: string;
      brand: string;
      image_url?: string | null;
    }) => {
      const saved = await addToShelf({
        name: product.name,
        brand: product.brand,
        barcode: null,
        ingredients: [],
        source: 'manual',
        image_url: product.image_url ?? null,
        tracking_enabled: false,
        trial_days: null,
        usage_time: null,
        times_per_week: null,
      });
      setProducts((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
      void refresh({ silent: true });
      return saved;
    },
    [refresh],
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      const previous = products;
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      try {
        await removeFromShelf(productId);
        void refresh({ silent: true });
      } catch (err) {
        setProducts(previous);
        setError(err instanceof Error ? err.message : 'Failed to remove product');
      }
    },
    [products, refresh],
  );

  return {
    products,
    conflicts,
    loading,
    error,
    refresh,
    addProduct,
    addRecommendation,
    removeProduct,
  };
}
