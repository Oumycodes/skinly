import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardChrome } from '../../constants/cards';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import type { ShelfProduct } from '../../services/products';
import {
  getCategoryColor,
  getCategoryLabel,
  guessCategory,
} from '../../utils/productCategory';

interface ShelfProductCardProps {
  product: ShelfProduct;
  onPress?: () => void;
  onRemove?: (id: string) => void;
}

export function ShelfProductCard({ product, onPress, onRemove }: ShelfProductCardProps) {
  const category = guessCategory(product.name, product.ingredients);
  const letter = (product.brand ?? product.name).charAt(0).toUpperCase();
  const tags = product.ingredients.slice(0, 2);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: getCategoryColor(category) }]}>
        <Text style={styles.avatarText}>{letter}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.brand}>{(product.brand ?? 'Unknown').toUpperCase()}</Text>
        <Text style={styles.name}>{product.name}</Text>
        {tags.length > 0 && (
          <View style={styles.tags}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.right}>
        <Text style={styles.category}>{getCategoryLabel(category)}</Text>
        {onRemove && (
          <Pressable onPress={() => onRemove(product.id)} hitSlop={8}>
            <Text style={styles.remove}>✕</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.item,
    ...cardChrome,
    borderRadius: radii.md,
    padding: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  brand: {
    ...type.statLabel,
    letterSpacing: 0.8,
  },
  name: {
    ...type.cardTitle,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.inner,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  tagText: {
    ...type.caption,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.inner,
  },
  category: {
    ...type.statLabel,
  },
  remove: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
