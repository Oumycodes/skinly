import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionLabel } from '../components/ui/SectionLabel';
import { cardChrome } from '../constants/cards';
import { colors, radii } from '../constants/colors';
import { layout } from '../constants/layout';
import { spacing } from '../constants/spacing';
import { font, type } from '../constants/typography';
import { useShelf } from '../hooks/useShelf';
import type { ShelfProduct, UsageTime } from '../services/products';
import { useProductSchedules } from '../services/productSchedule';
import {
  getCategoryLabel,
  guessCategory,
  type ProductCategory,
} from '../utils/productCategory';

type Period = 'AM' | 'PM';

const USAGE_LABEL: Record<UsageTime, string> = {
  morning: 'Morning',
  night: 'Night',
  both: 'AM · PM',
};

const CATEGORY_ORDER: ProductCategory[] = [
  'cleanser',
  'serum',
  'moisturizer',
  'spf',
  'other',
];

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function todayKey(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function doneStorageKey(period: Period): string {
  return `@skins/routine_done/${period}/${todayKey()}`;
}

function matchesPeriod(product: ShelfProduct, period: Period): boolean {
  const t = product.usage_time;
  if (!t) return true; // unspecified → show in both
  if (period === 'AM') return t === 'morning' || t === 'both';
  return t === 'night' || t === 'both';
}

export function RoutineScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { products, refresh: refreshShelf } = useShelf();
  const { schedules, refresh: refreshSchedules } = useProductSchedules();
  const [period, setPeriod] = useState<Period>('AM');
  const [doneToday, setDoneToday] = useState<Set<string>>(new Set());

  const todayWeekday = new Date().getDay();
  const todayName = WEEKDAY_NAMES[todayWeekday];

  useFocusEffect(
    useCallback(() => {
      void refreshShelf({ silent: true });
      void refreshSchedules();
    }, [refreshShelf, refreshSchedules]),
  );

  // Products scheduled for today + this period, in routine order
  const todaysProducts = useMemo(() => {
    return products
      .filter((p) => {
        const sched = schedules[p.id];
        const scheduledToday = sched ? sched.includes(todayWeekday) : true;
        return scheduledToday && matchesPeriod(p, period);
      })
      .sort((a, b) => {
        const ca = guessCategory(a.name, a.ingredients);
        const cb = guessCategory(b.name, b.ingredients);
        return CATEGORY_ORDER.indexOf(ca) - CATEGORY_ORDER.indexOf(cb);
      });
  }, [products, schedules, period, todayWeekday]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(doneStorageKey(period)).then((raw) => {
      if (!active) return;
      try {
        setDoneToday(new Set(raw ? (JSON.parse(raw) as string[]) : []));
      } catch {
        setDoneToday(new Set());
      }
    });
    return () => {
      active = false;
    };
  }, [period]);

  const toggleDone = useCallback(
    (productId: string) => {
      setDoneToday((prev) => {
        const next = new Set(prev);
        if (next.has(productId)) next.delete(productId);
        else next.add(productId);
        void AsyncStorage.setItem(doneStorageKey(period), JSON.stringify([...next]));
        return next;
      });
    },
    [period],
  );

  function usageLine(product: ShelfProduct): string {
    const parts: string[] = [getCategoryLabel(guessCategory(product.name, product.ingredients))];
    if (product.usage_time) parts.push(USAGE_LABEL[product.usage_time]);
    return parts.join(' · ');
  }

  const doneCount = todaysProducts.filter((p) => doneToday.has(p.id)).length;
  const total = todaysProducts.length;
  const hasSpf =
    period === 'AM' &&
    total > 0 &&
    !todaysProducts.some((p) => guessCategory(p.name, p.ingredients) === 'spf');

  return (
    <View style={[styles.container, { paddingTop: insets.top + layout.screenPaddingTop }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + layout.modalScrollBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <SectionLabel label={`${todayName}'s routine`} />
        <Text style={styles.title}>Today's checklist</Text>

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

        {hasSpf ? (
          <View style={styles.alert}>
            <Text style={styles.alertIcon}>⚠</Text>
            <Text style={styles.alertText}>
              No SPF scheduled this morning — add one to protect your skin.
            </Text>
          </View>
        ) : null}

        {total > 0 ? (
          <>
            <View style={styles.stepsHeader}>
              <SectionLabel label={period === 'AM' ? 'Morning' : 'Evening'} />
              <Text style={styles.checklistCount}>
                {doneCount}/{total} done
              </Text>
            </View>
            <View style={styles.stepsList}>
            {todaysProducts.map((product) => {
              const checked = doneToday.has(product.id);
              return (
                <Pressable
                  key={product.id}
                  style={styles.stepRow}
                  onPress={() => toggleDone(product.id)}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                    {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
                  </View>
                  {product.image_url ? (
                    <Image
                      source={{ uri: product.image_url }}
                      style={styles.stepThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.stepThumb, styles.stepThumbPlaceholder]} />
                  )}
                  <View style={styles.stepInfo}>
                    <Text style={[styles.stepName, checked && styles.stepNameDone]}>
                      {product.name}
                    </Text>
                    <Text style={styles.stepReason}>{usageLine(product)}</Text>
                  </View>
                </Pressable>
              );
            })}
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing scheduled</Text>
            <Text style={styles.empty}>
              No products set for this {period === 'AM' ? 'morning' : 'evening'}. Add
              products from your shelf and pick the days you use them.
            </Text>
          </View>
        )}
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
  title: {
    ...type.screenTitle,
  },
  toggle: {
    flexDirection: 'row',
    ...cardChrome,
    borderRadius: radii.full,
    padding: spacing.inner / 2,
    marginTop: spacing.inner,
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
    marginTop: spacing.inner,
  },
  alertIcon: {
    fontSize: 16,
  },
  alertText: {
    flex: 1,
    ...type.bodySmall,
    color: colors.text,
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.inner,
  },
  checklistCount: {
    ...font.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  stepsList: {
    gap: 8,
    marginTop: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.item,
    ...cardChrome,
    borderRadius: radii.sm,
    padding: 12,
  },
  stepThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
  },
  stepThumbPlaceholder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  checkboxTick: {
    ...font.semibold,
    fontSize: 13,
    color: colors.surface,
    lineHeight: 15,
  },
  stepInfo: {
    flex: 1,
    gap: 2,
  },
  stepName: {
    ...type.cardTitle,
    fontSize: 14,
  },
  stepNameDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  stepReason: {
    ...type.caption,
    fontSize: 12,
  },
  emptyCard: {
    ...cardChrome,
    borderRadius: radii.md,
    padding: spacing.screen,
    gap: 6,
    marginTop: spacing.section,
    alignItems: 'center',
  },
  emptyTitle: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  empty: {
    ...type.bodySmall,
    textAlign: 'center',
  },
});
