import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import { useAuth } from '../../lib/auth/AuthProvider';
import {
  addToShelf,
  removeFromShelf,
  searchProducts,
  type ProductSearchResult,
} from '../../services/products';
import {
  createRoutineProduct,
  isRoutineProductArray,
  type OnboardingRoutineProduct,
  type RoutinePeriod,
} from '../../types/onboardingRoutine';
import { getCategoryLabel, guessCategory } from '../../utils/productCategory';

const PERIOD_OPTIONS: { id: RoutinePeriod; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'night', label: 'Night' },
  { id: 'both', label: 'Both' },
];
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

interface OnboardingRoutineStepProps {
  title: string;
  subtitle: string;
  value: OnboardingRoutineProduct[];
  onChange: (value: OnboardingRoutineProduct[]) => void;
}

export function OnboardingRoutineStep({
  title,
  subtitle,
  value,
  onChange,
}: OnboardingRoutineStepProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const matches = await searchProducts(query.trim());
        setResults(matches.slice(0, 5));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  const addProduct = useCallback(
    async (name: string, brand?: string, imageUrl?: string | null) => {
      const trimmed = name.trim();
      if (!trimmed || saving) return;
      const exists = value.some(
        (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exists) return;

      setSaving(true);
      setError(null);
      try {
        let shelfId: string | null = null;
        if (user) {
          const shelfProduct = await addToShelf({
            name: trimmed,
            brand: brand ?? null,
            barcode: null,
            ingredients: [],
            source: 'manual',
            image_url: imageUrl ?? null,
          });
          shelfId = shelfProduct.id;
        }

        const product = createRoutineProduct(trimmed, brand, imageUrl, shelfId);
        product.category = guessCategory(product.name, []);
        onChange([...value, product]);
        setQuery('');
        setResults([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not add product to shelf');
      } finally {
        setSaving(false);
      }
    },
    [onChange, saving, user, value],
  );

  function updateProduct(id: string, patch: Partial<OnboardingRoutineProduct>) {
    onChange(value.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function removeProduct(id: string) {
    const target = value.find((item) => item.id === id);
    if (!target) return;

    if (user && target.shelfId) {
      try {
        await removeFromShelf(target.shelfId);
      } catch {
        // Still remove locally if shelf delete fails
      }
    }
    onChange(value.filter((item) => item.id !== id));
  }

  return (
    <View style={styles.step}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.addBar}>
        <TextInput
          style={styles.addInput}
          placeholder="Search or type a product name"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void addProduct(query)}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, (!query.trim() || saving) && styles.addButtonDisabled]}
          onPress={() => void addProduct(query)}
          disabled={!query.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="add" size={22} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {user ? (
        <Text style={styles.shelfHint}>Products are saved to your shelf as you add them.</Text>
      ) : (
        <Text style={styles.shelfHint}>Sign in first so products can be saved to your shelf.</Text>
      )}

      {searching ? (
        <ActivityIndicator color={colors.primary} style={styles.searching} />
      ) : null}

      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map((result) => (
            <Pressable
              key={`${result.brand}-${result.name}`}
              style={styles.resultRow}
              onPress={() => void addProduct(result.name, result.brand, result.image_url)}
            >
              <ProductThumb uri={result.image_url} />
              <View style={styles.resultText}>
                <Text style={styles.resultName}>{result.name}</Text>
                {result.brand ? <Text style={styles.resultBrand}>{result.brand}</Text> : null}
              </View>
              <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {value.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptyBody}>
            Add cleansers, serums, moisturizers, SPF — anything you use regularly.
          </Text>
        </View>
      ) : (
        <View style={styles.productList}>
          {value.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <ProductThumb uri={product.imageUrl} large />
                <View style={styles.productTitleGroup}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.brand ? (
                    <Text style={styles.productBrand}>{product.brand}</Text>
                  ) : null}
                  <Text style={styles.productCategory}>
                    {getCategoryLabel(guessCategory(product.name, []))}
                  </Text>
                </View>
                <Pressable onPress={() => void removeProduct(product.id)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>When do you use it?</Text>
              <View style={styles.chipRow}>
                {PERIOD_OPTIONS.map((option) => {
                  const selected = product.period === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => updateProduct(product.id, { period: option.id })}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Times per week</Text>
              <View style={styles.chipRow}>
                {DAY_OPTIONS.map((days) => {
                  const selected = product.daysPerWeek === days;
                  return (
                    <Pressable
                      key={days}
                      style={[styles.dayChip, selected && styles.chipSelected]}
                      onPress={() => updateProduct(product.id, { daysPerWeek: days })}
                    >
                      <Text style={[styles.dayChipText, selected && styles.chipTextSelected]}>
                        {days === 7 ? '7' : String(days)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ProductThumb({ uri, large }: { uri?: string | null; large?: boolean }) {
  const size = large ? 56 : 40;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: 12, backgroundColor: colors.surfaceMuted }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="image-outline" size={large ? 22 : 18} color={colors.textMuted} />
    </View>
  );
}

export function parseRoutineAnswer(value: unknown): OnboardingRoutineProduct[] {
  return isRoutineProductArray(value) ? value : [];
}

const styles = StyleSheet.create({
  step: {
    gap: spacing.section,
  },
  title: {
    ...type.screenTitle,
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    ...type.body,
    marginTop: -8,
  },
  errorText: {
    ...type.bodySmall,
    color: colors.error,
    marginTop: -8,
  },
  shelfHint: {
    ...type.bodySmall,
    color: colors.textSecondary,
    marginTop: -8,
  },
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.inner,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingLeft: spacing.screen,
    paddingRight: 6,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  addInput: {
    flex: 1,
    ...font.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 10,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.fab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.35,
  },
  searching: {
    marginTop: -8,
  },
  results: {
    marginTop: -8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.item,
    paddingHorizontal: spacing.screen,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  resultText: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.item,
  },
  resultName: {
    ...font.semibold,
    fontSize: 15,
    color: colors.text,
  },
  resultBrand: {
    ...type.bodySmall,
  },
  emptyCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.screen,
    gap: 6,
  },
  emptyTitle: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  emptyBody: {
    ...type.bodySmall,
  },
  productList: {
    gap: spacing.item,
  },
  productCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.screen,
    gap: spacing.item,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.item,
  },
  productTitleGroup: {
    flex: 1,
    gap: 2,
  },
  productName: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  productBrand: {
    ...type.bodySmall,
  },
  productCategory: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  fieldLabel: {
    ...font.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  chipSelected: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  chipText: {
    ...font.semibold,
    fontSize: 13,
    color: colors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  dayChipText: {
    ...font.semibold,
    fontSize: 14,
    color: colors.text,
  },
});
