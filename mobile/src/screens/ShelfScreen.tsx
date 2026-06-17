import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarcodeScanner } from '../components/BarcodeScanner';
import { HomeHeader } from '../components/home/HomeHeader';
import { ConflictAlert } from '../components/shelf/ConflictAlert';
import { ShelfProductCard } from '../components/shelf/ShelfProductCard';
import { FilterChips } from '../components/ui/FilterChips';
import { SectionLabel } from '../components/ui/SectionLabel';
import { colors, radii } from '../constants/colors';
import { fonts } from '../constants/typography';
import { useShelf } from '../hooks/useShelf';
import { useDashboard } from '../hooks/useDashboard';
import { identifyProduct, lookupBarcode, searchProducts } from '../services/products';
import { guessCategory } from '../utils/productCategory';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'cleanser', label: 'Cleanser', icon: '💧' },
  { id: 'serum', label: 'Serum', icon: '⚗' },
  { id: 'moisturizer', label: 'Moisturizer', icon: '✦' },
  { id: 'spf', label: 'SPF', icon: '☀' },
];

export function ShelfScreen() {
  const insets = useSafeAreaInsets();
  const { products, conflicts, loading, error, addProduct, removeProduct, refresh } =
    useShelf();
  const { data: dashboard } = useDashboard();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [apiResults, setApiResults] = useState<
    Awaited<ReturnType<typeof searchProducts>>
  >([]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const cat = guessCategory(p.name, p.ingredients);
      const matchesFilter = filter === 'all' || cat === filter;
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q) ||
        p.ingredients.some((i) => i.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [products, filter, query]);

  async function handleApiSearch() {
    if (query.trim().length < 2) return;
    setAdding(true);
    try {
      setApiResults(await searchProducts(query.trim()));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setAdding(false);
    }
  }

  async function handleBarcodeScan(barcode: string) {
    setAdding(true);
    setActionError(null);
    try {
      await addProduct(await lookupBarcode(barcode), 'barcode');
      setShowBarcode(false);
      setShowAdd(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Barcode lookup failed');
    } finally {
      setAdding(false);
    }
  }

  async function handlePhotoPick() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (result.canceled || !result.assets[0]) return;

    setAdding(true);
    try {
      await addProduct(await identifyProduct(result.assets[0].uri), 'photo');
      setShowAdd(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Photo identification failed');
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <HomeHeader streak={dashboard?.streak ?? 0} />
            <SectionLabel label="My shelf" />
            <Text style={styles.title}>
              {products.length} product{products.length === 1 ? '' : 's'}
            </Text>
            <Text style={styles.subtitle}>
              Every product you own, scanned for ingredients.
            </Text>

            <View style={styles.searchRow}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or ingredient"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleApiSearch}
              />
              <Pressable onPress={() => setShowAdd(true)} hitSlop={8}>
                <Text style={styles.addLink}>+</Text>
              </Pressable>
            </View>

            <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />

            {conflicts && <ConflictAlert conflicts={conflicts} />}
            {(error || actionError) && (
              <Text style={styles.error}>{actionError ?? error}</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <Text style={styles.empty}>No products yet. Tap + to add one.</Text>
          )
        }
        renderItem={({ item }) => (
          <ShelfProductCard product={item} onRemove={removeProduct} />
        )}
      />

      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>Add product</Text>
            <Pressable style={styles.modalOption} onPress={() => { setShowAdd(false); setShowBarcode(true); }}>
              <Text style={styles.modalOptionText}>▮▮ Scan barcode</Text>
            </Pressable>
            <Pressable style={styles.modalOption} onPress={handlePhotoPick}>
              <Text style={styles.modalOptionText}>📷 Photo of packaging</Text>
            </Pressable>
            <Pressable style={styles.modalOption} onPress={handleApiSearch}>
              <Text style={styles.modalOptionText}>⌕ Search Open Beauty Facts</Text>
            </Pressable>

            {apiResults.length > 0 && (
              <ScrollView style={styles.apiResults}>
                {apiResults.map((item) => (
                  <Pressable
                    key={`${item.brand}-${item.name}`}
                    style={styles.apiResult}
                    onPress={async () => {
                      setAdding(true);
                      try {
                        await addProduct(item, 'manual');
                        setApiResults([]);
                        setShowAdd(false);
                      } finally {
                        setAdding(false);
                      }
                    }}
                  >
                    <Text style={styles.apiName}>{item.name}</Text>
                    <Text style={styles.apiBrand}>{item.brand}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <Pressable onPress={() => setShowAdd(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <BarcodeScanner
        visible={showBarcode}
        onClose={() => setShowBarcode(false)}
        onScan={handleBarcodeScan}
      />

      {adding && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.surface} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  headerBlock: {
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
    color: colors.textMuted,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.text,
  },
  addLink: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '300',
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.error,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 32,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: 20,
    gap: 10,
    maxHeight: '70%',
  },
  modalTitle: {
    fontFamily: fonts.serifRegular,
    fontSize: 22,
    color: colors.text,
    marginBottom: 4,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalOptionText: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.text,
  },
  apiResults: {
    maxHeight: 200,
  },
  apiResult: {
    paddingVertical: 10,
  },
  apiName: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.text,
  },
  apiBrand: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalCancel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
