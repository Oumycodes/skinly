import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckInBanner } from '../components/shelf/CheckInBanner';
import { ProductTrackingDetailSheet } from '../components/shelf/ProductTrackingDetailSheet';
import { TrackingProductCard } from '../components/shelf/TrackingProductCard';
import {
  TrackProductSheet,
  type PendingShelfProduct,
  type TrackAddResult,
} from '../components/shelf/TrackProductSheet';
import { cardChrome } from '../constants/cards';
import { colors, radii } from '../constants/colors';
import { layout } from '../constants/layout';
import { spacing } from '../constants/spacing';
import { font, type } from '../constants/typography';
import { useShelf } from '../hooks/useShelf';
import { type ScanDetail } from '../services/dashboard';
import {
  getCachedScanHistory,
  loadScanHistory,
} from '../services/scanHistoryCache';
import { identifyProduct, searchProducts, getTrackingInsights, type TrackingInsight } from '../services/products';
import { setProductSchedule, removeProductSchedule } from '../services/productSchedule';
import { shortenProductName } from '../utils/productName';
import { guessCategory, type ProductCategory } from '../utils/productCategory';
import {
  applyTrackingInsights,
  buildProductTracking,
  type ProductTracking,
} from '../utils/productTracking';

const CATEGORY_ORDER: ProductCategory[] = [
  'cleanser',
  'serum',
  'moisturizer',
  'spf',
  'other',
];

function categoryLabel(category: ProductCategory): string {
  if (category === 'spf') return 'SPF';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function groupByCategory(
  items: ProductTracking[],
): Array<{ category: ProductCategory; items: ProductTracking[] }> {
  const byCat = new Map<ProductCategory, ProductTracking[]>();
  for (const item of items) {
    const cat = guessCategory(item.product.name, item.product.ingredients);
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(item);
  }
  return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((category) => ({
    category,
    items: byCat.get(category)!,
  }));
}

const DISMISSED_CHECKINS_KEY = '@skins/dismissed_product_checkins';

export function ShelfScreen() {
  const insets = useSafeAreaInsets();
  const { products, loading, error, addProduct, removeProduct, refresh } =
    useShelf();

  const [history, setHistory] = useState<ScanDetail[]>(
    () => getCachedScanHistory() ?? [],
  );
  const [historyLoading, setHistoryLoading] = useState(
    () => getCachedScanHistory() == null,
  );
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showUploadChoices, setShowUploadChoices] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<PendingShelfProduct | null>(null);
  const [trackStep, setTrackStep] = useState<'usage' | 'ask' | 'duration'>('usage');
  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [apiResults, setApiResults] = useState<
    Awaited<ReturnType<typeof searchProducts>>
  >([]);
  const [dismissedCheckIns, setDismissedCheckIns] = useState<Set<string>>(new Set());
  const [selectedCheckIn, setSelectedCheckIn] = useState<ProductTracking | null>(null);
  const [trackingInsights, setTrackingInsights] = useState<TrackingInsight[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');

  const loadHistory = useCallback(async (force = false) => {
    if (getCachedScanHistory() == null) setHistoryLoading(true);
    try {
      setHistory(await loadScanHistory(90, force));
    } catch {
      if (getCachedScanHistory() == null) setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadTrackingInsights = useCallback(async () => {
    try {
      const result = await getTrackingInsights();
      setTrackingInsights(result.insights ?? []);
    } catch {
      setTrackingInsights([]);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    void loadTrackingInsights();
    void AsyncStorage.getItem(DISMISSED_CHECKINS_KEY).then((raw) => {
      if (!raw) return;
      try {
        setDismissedCheckIns(new Set(JSON.parse(raw) as string[]));
      } catch {
        // ignore
      }
    });
  }, [loadHistory, loadTrackingInsights]);

  const trackingList = useMemo(
    () =>
      applyTrackingInsights(
        products
          .map((product) => buildProductTracking(product, history))
          .sort((a, b) => {
            const aTracked = a.product.tracking_enabled !== false ? 1 : 0;
            const bTracked = b.product.tracking_enabled !== false ? 1 : 0;
            if (aTracked !== bTracked) return bTracked - aTracked;
            return b.day / b.trialDays - a.day / a.trialDays;
          }),
        trackingInsights,
      ),
    [products, history, trackingInsights],
  );

  const shelfGroups = useMemo(
    () => groupByCategory(trackingList),
    [trackingList],
  );

  const checkIn = useMemo(() => {
    return (
      trackingList.find(
        (item) =>
          item.checkInReady &&
          !dismissedCheckIns.has(`${item.product.id}:${item.trialDays}`),
      ) ?? null
    );
  }, [trackingList, dismissedCheckIns]);

  async function dismissCheckIn(tracking: ProductTracking) {
    const key = `${tracking.product.id}:${tracking.trialDays}`;
    const next = new Set(dismissedCheckIns);
    next.add(key);
    setDismissedCheckIns(next);
    await AsyncStorage.setItem(DISMISSED_CHECKINS_KEY, JSON.stringify([...next]));
  }

  async function handleRefresh() {
    setPullRefreshing(true);
    try {
      await Promise.all([
        refresh({ silent: true }),
        loadHistory(true),
        loadTrackingInsights(),
      ]);
    } finally {
      setPullRefreshing(false);
    }
  }

  async function handleApiSearch() {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    setActionError(null);
    try {
      setApiResults(await searchProducts(searchQuery.trim()));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function identifyAndAdd(photoUri: string) {
    setAdding(true);
    setActionError(null);
    try {
      const identified = await identifyProduct(photoUri);
      beginTrackPrompt(
        { ...identified, image_url: identified.image_url ?? photoUri },
        'photo',
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Photo identification failed');
    } finally {
      setAdding(false);
    }
  }

  function beginTrackPrompt(
    product: PendingShelfProduct['product'],
    source: PendingShelfProduct['source'],
  ) {
    setShowAdd(false);
    setShowUploadChoices(false);
    setApiResults([]);
    setSearchQuery('');
    setTrackStep('usage');
    setPendingProduct({ product, source });
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (result.canceled || !result.assets[0]) return;
    await identifyAndAdd(result.assets[0].uri);
  }

  async function handleUploadFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (result.canceled || !result.assets[0]) return;
    await identifyAndAdd(result.assets[0].uri);
  }

  function handleSelectSearchResult(
    item: Awaited<ReturnType<typeof searchProducts>>[number],
  ) {
    beginTrackPrompt(item, 'manual');
  }

  async function finishAdd(result: TrackAddResult) {
    if (!pendingProduct) return;
    setAdding(true);
    setActionError(null);
    try {
      const saved = await addProduct(pendingProduct.product, pendingProduct.source, {
        trackingEnabled: result.trackingEnabled,
        trialDays: result.trackingEnabled ? result.trialDays ?? 28 : null,
        usageTime: result.usageTime,
        timesPerWeek: result.timesPerWeek,
      });
      await setProductSchedule(saved.id, result.days);
      setPendingProduct(null);
      setTrackStep('usage');
      void loadTrackingInsights();
      void refresh({ silent: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add product');
    } finally {
      setAdding(false);
    }
  }

  function closeAddModal() {
    setShowAdd(false);
    setShowUploadChoices(false);
    setSearchQuery('');
    setApiResults([]);
    setSearching(false);
  }

  function closeTrackPrompt() {
    setPendingProduct(null);
    setTrackStep('usage');
  }
  const isEmpty = !loading && !historyLoading && products.length === 0;
  const showInitialSpinner = loading && products.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + layout.screenPaddingTop }]}>
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + layout.tabScrollBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headerBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Shelf</Text>
            <Pressable style={styles.addButton} onPress={() => setShowAdd(true)}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </Pressable>
          </View>

          {checkIn ? (
            <CheckInBanner
              tracking={checkIn}
              onSeeDetails={() => setSelectedCheckIn(checkIn)}
              onDismiss={() => void dismissCheckIn(checkIn)}
            />
          ) : null}

          {(error || actionError) && (
            <Text style={styles.error}>{actionError ?? error}</Text>
          )}
        </View>

        {showInitialSpinner || historyLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : isEmpty ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing on your shelf yet</Text>
            <Text style={styles.emptyBody}>
              Add a product to track how it affects your skin over time.
            </Text>
            <Pressable style={styles.emptyBtn} onPress={() => setShowAdd(true)}>
              <Text style={styles.emptyBtnText}>Add your first product</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {[
                { key: 'all' as const, label: 'All' },
                ...shelfGroups.map((g) => ({
                  key: g.category,
                  label: categoryLabel(g.category),
                })),
              ].map((tab) => {
                const active = categoryFilter === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setCategoryFilter(tab.key)}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        active && styles.filterPillTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {shelfGroups
              .filter(
                (group) =>
                  categoryFilter === 'all' || group.category === categoryFilter,
              )
              .map((group) => (
                <View key={group.category} style={styles.catGroup}>
                  {group.items.map((item) => (
                    <TrackingProductCard
                      key={item.product.id}
                      tracking={item}
                      onPress={() => setSelectedCheckIn(item)}
                      onRemove={(id) => {
                        void removeProductSchedule(id);
                        void removeProduct(id);
                      }}
                    />
                  ))}
                </View>
              ))}
          </>
        )}
      </ScrollView>

      <ProductTrackingDetailSheet
        tracking={selectedCheckIn}
        history={history}
        onClose={() => setSelectedCheckIn(null)}
      />

      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.modalBackdropFlex}
            onPress={() => {
              if (showUploadChoices) {
                setShowUploadChoices(false);
                return;
              }
              closeAddModal();
            }}
          />

          {showUploadChoices ? (
            <Pressable
              style={styles.uploadDismiss}
              onPress={() => setShowUploadChoices(false)}
            />
          ) : null}

          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add product</Text>

            {apiResults.length === 0 && !searching ? (
              <View style={styles.uploadAnchor}>
                {showUploadChoices ? (
                  <View style={styles.uploadPopover}>
                    <Pressable
                      style={styles.uploadRow}
                      onPress={() => {
                        setShowUploadChoices(false);
                        setTimeout(() => void handleUploadFromGallery(), 150);
                      }}
                    >
                      <Text style={styles.uploadLabel}>Photo Library</Text>
                      <Ionicons name="images-outline" size={20} color={colors.text} />
                    </Pressable>
                    <View style={styles.uploadDivider} />
                    <Pressable
                      style={styles.uploadRow}
                      onPress={() => {
                        setShowUploadChoices(false);
                        setTimeout(() => void handleTakePhoto(), 150);
                      }}
                    >
                      <Text style={styles.uploadLabel}>Take Photo</Text>
                      <Ionicons name="camera-outline" size={20} color={colors.text} />
                    </Pressable>
                  </View>
                ) : null}

                <Pressable
                  style={styles.modalOption}
                  onPress={() => setShowUploadChoices((open) => !open)}
                >
                  <Text style={styles.modalOptionText}>Upload</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.modalSearchRow}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search products"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => void handleApiSearch()}
                returnKeyType="search"
              />
              <Pressable style={styles.modalSearchBtn} onPress={() => void handleApiSearch()}>
                <Text style={styles.modalSearchBtnText}>
                  {searching ? '…' : 'Search'}
                </Text>
              </Pressable>
            </View>

            {searching ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
            ) : null}

            {apiResults.length > 0 ? (
              <ScrollView
                style={styles.apiResults}
                contentContainerStyle={styles.apiResultsContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {apiResults.map((item) => (
                  <Pressable
                    key={`${item.brand}-${item.name}-${item.barcode ?? ''}`}
                    style={styles.apiResult}
                    onPress={() => handleSelectSearchResult(item)}
                    disabled={adding}
                  >
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.apiThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.apiThumb, styles.apiThumbEmpty]}>
                        <Text style={styles.apiThumbPlaceholder}>✦</Text>
                      </View>
                    )}
                    <View style={styles.apiText}>
                      <Text style={styles.apiName} numberOfLines={2}>
                        {shortenProductName(item.name, item.brand)}
                      </Text>
                      <Text style={styles.apiBrand}>{item.brand}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <Pressable onPress={closeAddModal} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <TrackProductSheet
        pending={pendingProduct}
        step={trackStep}
        onStepChange={setTrackStep}
        onComplete={(result) => void finishAdd(result)}
        onClose={closeTrackPrompt}
      />

      {adding && (
        <View style={styles.overlay} pointerEvents="auto">
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
    paddingHorizontal: spacing.screen,
    gap: spacing.item,
  },
  catGroup: {
    gap: spacing.item,
    marginTop: spacing.item,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    paddingRight: spacing.screen,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  filterPillText: {
    ...font.semibold,
    fontSize: 15,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.surface,
  },
  headerBlock: {
    gap: spacing.titleBelow,
    marginBottom: spacing.inner,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.item,
  },
  title: {
    ...type.screenTitle,
  },
  addButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: {
    ...font.semibold,
    fontSize: 14,
    color: colors.text,
  },
  error: {
    ...type.bodySmall,
    color: colors.error,
  },
  emptyCard: {
    ...cardChrome,
    borderRadius: radii.lg,
    padding: spacing.screen,
    gap: spacing.item,
    marginTop: spacing.item,
  },
  emptyTitle: {
    ...font.semibold,
    fontSize: 17,
    color: colors.text,
  },
  emptyBody: {
    ...type.bodySmall,
  },
  emptyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.fab,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  emptyBtnText: {
    ...font.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  modalAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdropFlex: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    paddingBottom: 8,
    gap: 8,
    maxHeight: '92%',
    overflow: 'visible',
    zIndex: 50,
  },
  modalTitle: {
    ...type.sectionTitle,
    marginBottom: spacing.inner / 2,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalOptionText: {
    ...font.medium,
    fontSize: 16,
    color: colors.text,
  },
  uploadAnchor: {
    position: 'relative',
    zIndex: 50,
  },
  uploadDismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 45,
  },
  uploadPopover: {
    position: 'absolute',
    left: 0,
    width: 220,
    top: '100%',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 22,
    zIndex: 60,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    minHeight: 42,
  },
  uploadDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginLeft: 14,
  },
  uploadLabel: {
    ...font.medium,
    fontSize: 16,
    color: colors.text,
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.inner,
    marginTop: spacing.inner,
  },
  modalSearchInput: {
    flex: 1,
    ...cardChrome,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...font.regular,
    fontSize: 15,
    color: colors.text,
  },
  modalSearchBtn: {
    backgroundColor: colors.dark,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalSearchBtnText: {
    ...font.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  apiResults: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 160,
    maxHeight: 360,
  },
  apiResultsContent: {
    paddingBottom: 4,
  },
  apiResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.item,
    paddingVertical: 10,
  },
  apiThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
  },
  apiThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiThumbPlaceholder: {
    fontSize: 16,
    color: colors.textMuted,
  },
  apiText: {
    flex: 1,
    gap: 2,
  },
  apiName: {
    ...type.cardTitle,
  },
  apiBrand: {
    ...type.caption,
  },
  modalCancelBtn: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  modalCancel: {
    ...font.medium,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
