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
} from '../services/products';

export function useShelf() {
  const [products, setProducts] = useState<ShelfProduct[]>([]);
  const [conflicts, setConflicts] = useState<ConflictResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [shelf, conflictData] = await Promise.all([getShelf(), getConflicts()]);
      setProducts(shelf);
      setConflicts(conflictData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shelf');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addProduct = useCallback(
    async (product: ProductSearchResult, source: ProductSource) => {
      await addToShelf({
        name: product.name,
        brand: product.brand,
        barcode: product.barcode ?? null,
        ingredients: product.ingredients,
        source,
        image_url: product.image_url ?? null,
      });
      await refresh();
    },
    [refresh],
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      await removeFromShelf(productId);
      await refresh();
    },
    [refresh],
  );

  return { products, conflicts, loading, error, refresh, addProduct, removeProduct };
}
