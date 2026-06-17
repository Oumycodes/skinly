import { apiFetch } from './api';

export type ProductSource = 'photo' | 'barcode' | 'manual';

export interface ProductSearchResult {
  name: string;
  brand: string;
  barcode?: string | null;
  ingredients: string[];
  image_url?: string | null;
}

export interface ShelfProduct {
  id: string;
  user_id: string;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  ingredients: string[];
  source: ProductSource;
  image_url?: string | null;
  created_at: string;
}

export interface IngredientConflict {
  products: string[];
  severity: 'mild' | 'moderate' | 'severe';
  message: string;
}

export interface ConflictResult {
  conflicts: IngredientConflict[];
  has_conflicts: boolean;
}

export async function searchProducts(query: string): Promise<ProductSearchResult[]> {
  return apiFetch<ProductSearchResult[]>(
    `/products/search?q=${encodeURIComponent(query)}`,
  );
}

export async function lookupBarcode(barcode: string): Promise<ProductSearchResult> {
  return apiFetch<ProductSearchResult>(`/products/barcode/${barcode}`);
}

export async function identifyProduct(imageUri: string): Promise<ProductSearchResult> {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'product.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  return apiFetch<ProductSearchResult>('/products/identify', {
    method: 'POST',
    body: formData,
  });
}

export async function getShelf(): Promise<ShelfProduct[]> {
  return apiFetch<ShelfProduct[]>('/products/shelf');
}

export async function addToShelf(
  product: Omit<ShelfProduct, 'id' | 'user_id' | 'created_at'>,
): Promise<ShelfProduct> {
  return apiFetch<ShelfProduct>('/products/shelf', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export async function removeFromShelf(productId: string): Promise<void> {
  await apiFetch(`/products/shelf/${productId}`, { method: 'DELETE' });
}

export async function getConflicts(): Promise<ConflictResult> {
  return apiFetch<ConflictResult>('/products/conflicts');
}
