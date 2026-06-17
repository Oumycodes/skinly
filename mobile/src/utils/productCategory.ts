export type ProductCategory = 'cleanser' | 'serum' | 'moisturizer' | 'spf' | 'other';

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  cleanser: '#D6E8F5',
  serum: '#F5E8DF',
  moisturizer: '#E8F3E8',
  spf: '#E8F3E8',
  other: '#F3F1EB',
};

export function guessCategory(name: string, ingredients: string[]): ProductCategory {
  const text = `${name} ${ingredients.join(' ')}`.toLowerCase();
  if (text.includes('spf') || text.includes('sunscreen') || text.includes('sun ')) return 'spf';
  if (text.includes('cleanser') || text.includes('cleansing') || text.includes('wash'))
    return 'cleanser';
  if (text.includes('serum') || text.includes('niacinamide') || text.includes('retinol'))
    return 'serum';
  if (text.includes('moistur') || text.includes('cream') || text.includes('lotion'))
    return 'moisturizer';
  return 'other';
}

export function getCategoryColor(category: ProductCategory): string {
  return CATEGORY_COLORS[category];
}

export function getCategoryLabel(category: ProductCategory): string {
  return category === 'other' ? 'PRODUCT' : category.toUpperCase();
}
