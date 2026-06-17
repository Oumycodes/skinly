import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import type { ShelfProduct } from '../services/products';

interface ProductCardProps {
  product: ShelfProduct;
  onRemove: (id: string) => void;
}

const sourceLabels: Record<string, string> = {
  barcode: 'Barcode',
  photo: 'Photo',
  manual: 'Search',
};

export function ProductCard({ product, onRemove }: ProductCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
        <Text style={styles.meta}>
          Added via {sourceLabels[product.source] ?? product.source}
          {product.ingredients.length > 0 &&
            ` · ${product.ingredients.length} ingredients`}
        </Text>
      </View>
      <Pressable style={styles.removeButton} onPress={() => onRemove(product.id)}>
        <Text style={styles.removeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  brand: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
