import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { type } from '../../constants/typography';
import { useShelf } from '../../hooks/useShelf';
import type { ProductRecommendation } from '../../services/scan';
import type { SkinMeasure } from '../../utils/skinMeasures';
import { getMeasureIconBg } from '../ui/MeasureIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEASURE_CARD_WIDTH = SCREEN_WIDTH - spacing.screen * 2 - spacing.inner;
const SUGGESTION_INNER_WIDTH = MEASURE_CARD_WIDTH - spacing.section * 2;
const PRODUCT_CARD_WIDTH = SUGGESTION_INNER_WIDTH - 20;
const PRODUCT_GAP = spacing.item;
const DOT = '#D5D4D0';
const DOT_ACTIVE = '#111111';

interface MeasureSuggestionsProps {
  measure: SkinMeasure;
}

function productKey(product: Pick<ProductRecommendation, 'brand' | 'name'>) {
  return `${product.brand}-${product.name}`;
}

function ProductThumbnail({ product }: { product: ProductRecommendation }) {
  if (product.image_url) {
    return (
      <Image
        source={{ uri: product.image_url }}
        style={styles.productImage}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.productImageFallback}>
      <Text style={styles.productImageEmoji}>🧴</Text>
    </View>
  );
}

interface ProductCardProps {
  product: ProductRecommendation;
  onShelf: boolean;
  adding: boolean;
  onAdd: () => void;
  bgColor: string;
}

function ProductCard({ product, onShelf, adding, onAdd, bgColor }: ProductCardProps) {
  return (
    <View style={[styles.productRow, { width: PRODUCT_CARD_WIDTH, backgroundColor: bgColor }]}>
      <ProductThumbnail product={product} />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productBrand}>{product.brand}</Text>
        <Text style={styles.productReason} numberOfLines={3}>
          {product.reason}
        </Text>
      </View>
      <Pressable
        style={[styles.addButton, onShelf && styles.addButtonDone]}
        onPress={onAdd}
        disabled={onShelf || adding}
        hitSlop={8}
      >
        {adding ? (
          <ActivityIndicator size="small" color={colors.surface} />
        ) : onShelf ? (
          <Ionicons name="checkmark" size={18} color={colors.surface} />
        ) : (
          <Ionicons name="add" size={20} color={colors.surface} />
        )}
      </Pressable>
    </View>
  );
}

export function MeasureSuggestions({ measure }: MeasureSuggestionsProps) {
  const { products, addRecommendation } = useShelf();
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<ProductRecommendation>>(null);
  const productItems = useMemo(
    () => measure.recommendations.slice(0, 3),
    [measure.recommendations],
  );
  const hasProducts = productItems.length > 0;
  // Habit tip only — never re-print the same insight already on the measure card
  const tipText = useMemo(() => {
    const brief = measure.brief.trim();
    for (const tip of measure.tips) {
      const t = tip.trim();
      if (t && t !== brief && !brief.includes(t)) return t;
    }
    const detail = measure.detail.trim();
    if (detail && detail !== brief) return detail;
    return null;
  }, [measure.brief, measure.detail, measure.tips]);
  const measureBg = getMeasureIconBg(measure.id);

  useEffect(() => {
    setActiveIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [measure.id]);

  const isOnShelf = useCallback(
    (product: ProductRecommendation) =>
      products.some(
        (item) =>
          item.name.toLowerCase() === product.name.toLowerCase() &&
          (item.brand ?? '').toLowerCase() === product.brand.toLowerCase(),
      ),
    [products],
  );

  const handleAddToShelf = useCallback(
    async (product: ProductRecommendation) => {
      const key = productKey(product);
      if (isOnShelf(product) || addingKey === key) return;

      setAddingKey(key);
      try {
        await addRecommendation(product);
      } catch (err) {
        Alert.alert(
          'Could not add product',
          err instanceof Error ? err.message : 'Please try again.',
        );
      } finally {
        setAddingKey(null);
      }
    },
    [addRecommendation, addingKey, isOnShelf],
  );

  const renderProduct: ListRenderItem<ProductRecommendation> = useCallback(
    ({ item }) => {
      const key = productKey(item);
      return (
        <ProductCard
          product={item}
          onShelf={isOnShelf(item)}
          adding={addingKey === key}
          onAdd={() => handleAddToShelf(item)}
          bgColor={measureBg}
        />
      );
    },
    [addingKey, handleAddToShelf, isOnShelf, measureBg],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(
        event.nativeEvent.contentOffset.x / (PRODUCT_CARD_WIDTH + PRODUCT_GAP),
      );
      if (index >= 0 && index < productItems.length && index !== activeIndex) {
        setActiveIndex(index);
      }
    },
    [activeIndex, productItems.length],
  );

  const scrollToIndex = useCallback((index: number) => {
    setActiveIndex(index);
    listRef.current?.scrollToOffset({
      offset: index * (PRODUCT_CARD_WIDTH + PRODUCT_GAP),
      animated: true,
    });
  }, []);

  if (!tipText && !hasProducts) {
    return null;
  }

  return (
    <View style={[styles.suggestionBox, { backgroundColor: measureBg }]}>
      {tipText ? <Text style={styles.boxText}>{tipText}</Text> : null}

      {hasProducts && (
        <View style={styles.recommendedBlock}>
          <Text style={styles.boxLabel}>Try these products</Text>
          <FlatList
            ref={listRef}
            data={productItems}
            keyExtractor={productKey}
            renderItem={renderProduct}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={PRODUCT_CARD_WIDTH + PRODUCT_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.productList}
            ItemSeparatorComponent={() => <View style={{ width: PRODUCT_GAP }} />}
            onScroll={onScroll}
            scrollEventThrottle={16}
          />

          {productItems.length > 1 && (
            <View style={styles.dots}>
              {productItems.map((product, index) => (
                <Pressable
                  key={productKey(product)}
                  onPress={() => scrollToIndex(index)}
                  hitSlop={8}
                >
                  <View style={[styles.dot, index === activeIndex && styles.dotActive]} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  suggestionBox: {
    width: MEASURE_CARD_WIDTH,
    alignSelf: 'flex-start',
    gap: spacing.item,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.section,
    paddingVertical: spacing.screen,
    borderWidth: 1,
    borderColor: colors.borderCard,
    shadowColor: colors.textMuted,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  boxText: {
    ...type.body,
    color: colors.dark,
  },
  boxLabel: {
    ...type.label,
    color: colors.dark,
  },
  recommendedBlock: {
    gap: spacing.item,
  },
  productList: {
    paddingRight: spacing.inner / 2,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.sm,
    padding: spacing.titleBelow,
    gap: spacing.item,
    borderWidth: 1,
    borderColor: colors.borderCard,
    shadowColor: colors.textMuted,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  productImageFallback: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImageEmoji: {
    fontSize: 28,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    ...type.cardTitle,
  },
  productBrand: {
    ...type.caption,
    fontSize: 13,
  },
  productReason: {
    ...type.bodySmall,
    marginTop: spacing.inner / 2,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDone: {
    backgroundColor: colors.textMuted,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DOT,
  },
  dotActive: {
    backgroundColor: DOT_ACTIVE,
  },
});
