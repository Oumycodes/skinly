import { useNavigation } from '@react-navigation/native';
import { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionLabel } from '../components/ui/SectionLabel';
import { cardChrome } from '../constants/cards';
import { colors, radii } from '../constants/colors';
import { layout } from '../constants/layout';
import { spacing } from '../constants/spacing';
import { font, type } from '../constants/typography';
import { useRoutine } from '../hooks/useRoutine';
import { useShelf } from '../hooks/useShelf';
import type { Period, RoutineStep } from '../services/routine';
import {
  getCategoryColor,
  getCategoryLabel,
  guessCategory,
} from '../utils/productCategory';

function stepsFromProductIds(
  products: ReturnType<typeof useShelf>['products'],
  ids: Set<string>,
): RoutineStep[] {
  const selected = products.filter((p) => ids.has(p.id));
  const ordered = [...selected].sort((a, b) => {
    const ca = guessCategory(a.name, a.ingredients);
    const cb = guessCategory(b.name, b.ingredients);
    const order = ['cleanser', 'toner', 'serum', 'moisturizer', 'spf', 'other'];
    return order.indexOf(ca) - order.indexOf(cb);
  });

  return ordered.map((p, i) => ({
    order: i + 1,
    product_id: p.id,
    product_name: p.name,
    brand: p.brand,
    category: guessCategory(p.name, p.ingredients),
    reason: `Your ${guessCategory(p.name, p.ingredients)} step.`,
  }));
}

export function RoutineScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { products, loading: shelfLoading } = useShelf();
  const [period, setPeriod] = useState<Period>('AM');
  const { routine, loading, saving, error, autoBuild, save, setRoutine } = useRoutine(period);

  const selectedIds = useMemo(
    () => new Set(routine?.steps.map((s) => s.product_id) ?? []),
    [routine?.steps],
  );

  const hasSpf = routine?.steps.some((s) => s.category === 'spf') ?? false;
  const showSpfAlert = period === 'AM' && routine && routine.steps.length > 0 && !hasSpf;

  function toggleProduct(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    const steps = stepsFromProductIds(products, next);
    setRoutine({
      period,
      steps,
      status: period === 'AM' && !steps.some((s) => s.category === 'spf') ? 'INCOMPLETE' : steps.length ? 'READY' : 'INCOMPLETE',
    });
  }

  async function handleAutoBuild() {
    try {
      await autoBuild();
    } catch {
      // error shown via hook
    }
  }

  async function handleSave() {
    if (!routine || routine.steps.length === 0) {
      Alert.alert('No steps', 'Add products to your routine first.');
      return;
    }
    try {
      await save(routine.steps);
      Alert.alert('Saved', `Your ${period} routine is saved.`);
    } catch {
      // error shown via hook
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + layout.screenPaddingTop }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + layout.modalScrollBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <SectionLabel label="Routine builder" />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Your {period} routine</Text>
          <Pressable
            style={[styles.autoBuild, saving && styles.disabled]}
            onPress={handleAutoBuild}
            disabled={saving}
          >
            <Text style={styles.autoBuildIcon}>✦</Text>
            <Text style={styles.autoBuildText}>Auto-build</Text>
          </Pressable>
        </View>

        <View style={styles.toggle}>
          <Pressable
            style={[styles.toggleBtn, period === 'AM' && styles.toggleActive]}
            onPress={() => setPeriod('AM')}
          >
            <Text style={[styles.toggleText, period === 'AM' && styles.toggleTextActive]}>
              ☀ Morning
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, period === 'PM' && styles.toggleActive]}
            onPress={() => setPeriod('PM')}
          >
            <Text style={[styles.toggleText, period === 'PM' && styles.toggleTextActive]}>
              ☾ Evening
            </Text>
          </Pressable>
        </View>

        {showSpfAlert && (
          <View style={styles.alert}>
            <Text style={styles.alertIcon}>⚠</Text>
            <Text style={styles.alertText}>
              Add SPF — your morning routine isn't complete without it.
            </Text>
          </View>
        )}

        {routine && routine.steps.length > 0 && (
          <View style={styles.stepsSection}>
            <SectionLabel label="Your steps" />
            {routine.steps.map((step) => (
              <View key={step.product_id} style={styles.stepRow}>
                <Text style={styles.stepOrder}>{step.order}</Text>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepName}>{step.product_name}</Text>
                  <Text style={styles.stepReason}>{step.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <SectionLabel label="Add from your shelf" />

        {loading || shelfLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.section }} />
        ) : (
          products.map((product) => {
            const category = guessCategory(product.name, product.ingredients);
            const letter = (product.brand ?? product.name).charAt(0).toUpperCase();
            const inRoutine = selectedIds.has(product.id);

            return (
              <Pressable
                key={product.id}
                style={styles.productRow}
                onPress={() => toggleProduct(product.id)}
              >
                <View style={[styles.avatar, { backgroundColor: getCategoryColor(category) }]}>
                  <Text style={styles.avatarText}>{letter}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.category}>{getCategoryLabel(category)}</Text>
                  <Text style={styles.productName}>{product.name}</Text>
                </View>
                <View style={[styles.addBtn, inRoutine && styles.addBtnActive]}>
                  <Text style={[styles.addBtnText, inRoutine && styles.addBtnTextActive]}>
                    {inRoutine ? '✓' : '+'}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}

        {products.length === 0 && !shelfLoading && (
          <Text style={styles.empty}>Add products to your shelf first.</Text>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.saveBtn, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.saveBtnText}>Save {period} routine</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...layout.content,
  },
  close: {
    alignSelf: 'flex-end',
    padding: spacing.inner / 2,
  },
  closeText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.item,
  },
  title: {
    ...type.screenTitle,
    flex: 1,
  },
  autoBuild: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dark,
    paddingHorizontal: 14,
    paddingVertical: spacing.item,
    borderRadius: radii.full,
  },
  autoBuildIcon: {
    fontSize: 12,
    color: colors.surface,
  },
  autoBuildText: {
    ...font.semibold,
    fontSize: 13,
    color: colors.surface,
  },
  disabled: {
    opacity: 0.6,
  },
  toggle: {
    flexDirection: 'row',
    ...cardChrome,
    borderRadius: radii.full,
    padding: spacing.inner / 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.titleBelow,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.dark,
  },
  toggleText: {
    ...font.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.surface,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.item,
    backgroundColor: colors.accent.peach,
    borderRadius: radii.md,
    padding: 14,
  },
  alertIcon: {
    fontSize: 16,
  },
  alertText: {
    flex: 1,
    ...type.bodySmall,
    color: colors.text,
  },
  stepsSection: {
    gap: spacing.inner,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.item,
    ...cardChrome,
    borderRadius: radii.sm,
    padding: 14,
  },
  stepOrder: {
    ...font.semibold,
    fontSize: 14,
    color: colors.primary,
    width: 20,
  },
  stepInfo: {
    flex: 1,
    gap: 2,
  },
  stepName: {
    ...type.cardTitle,
    fontSize: 14,
  },
  stepReason: {
    ...type.caption,
    fontSize: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.item,
    ...cardChrome,
    borderRadius: radii.md,
    padding: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...font.semibold,
    fontSize: 15,
    color: colors.text,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  category: {
    ...type.statLabel,
    fontSize: 10,
  },
  productName: {
    ...type.cardTitle,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  addBtnText: {
    fontSize: 18,
    color: colors.textMuted,
    lineHeight: 20,
  },
  addBtnTextActive: {
    color: colors.surface,
    fontSize: 14,
  },
  empty: {
    ...type.bodySmall,
    textAlign: 'center',
    marginTop: spacing.screen,
  },
  error: {
    ...type.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: colors.dark,
    borderRadius: radii.full,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: spacing.inner,
  },
  saveBtnText: {
    ...type.button,
  },
});
