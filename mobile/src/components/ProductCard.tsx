import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardChrome } from '../constants/cards';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { font, type } from '../constants/typography';
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
    ...cardChrome,
    borderRadius: radii.md,
    padding: 16,
    gap: spacing.item,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...type.cardTitle,
    fontSize: 16,
  },
  brand: {
    ...type.bodySmall,
  },
  meta: {
    ...type.caption,
    marginTop: spacing.inner / 2,
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
    ...font.semibold,
    fontSize: 14,
    color: colors.textMuted,
  },
});
