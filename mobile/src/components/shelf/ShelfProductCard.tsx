import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';
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
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  brand: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  name: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  tagText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 8,
  },
  category: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  remove: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
