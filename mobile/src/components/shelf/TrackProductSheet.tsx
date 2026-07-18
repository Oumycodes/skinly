import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import type { ProductSearchResult, ProductSource, UsageTime } from '../../services/products';
import { getCategoryLabel, guessCategory } from '../../utils/productCategory';
import { shortenProductName } from '../../utils/productName';

export const TRACK_DURATION_OPTIONS = [
  { days: 14, label: '2 weeks' },
  { days: 28, label: '4 weeks' },
  { days: 56, label: '8 weeks' },
] as const;

export const USAGE_TIME_OPTIONS: { value: UsageTime; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'night', label: 'Night' },
  { value: 'both', label: 'Both' },
];

export type PendingShelfProduct = {
  product: ProductSearchResult;
  source: ProductSource;
};

export type TrackAddResult = {
  trackingEnabled: boolean;
  trialDays?: number;
  usageTime: UsageTime;
  timesPerWeek: number;
};

type Step = 'usage' | 'ask' | 'duration';

interface TrackProductSheetProps {
  pending: PendingShelfProduct | null;
  step: Step;
  onStepChange: (step: Step) => void;
  onComplete: (result: TrackAddResult) => void;
  onClose: () => void;
}

export function TrackProductSheet({
  pending,
  step,
  onStepChange,
  onComplete,
  onClose,
}: TrackProductSheetProps) {
  const insets = useSafeAreaInsets();
  const [usageTime, setUsageTime] = useState<UsageTime>('both');
  const [timesPerWeek, setTimesPerWeek] = useState(7);

  useEffect(() => {
    if (pending) {
      setUsageTime('both');
      setTimesPerWeek(7);
    }
  }, [pending]);

  if (!pending) return null;

  const { product } = pending;
  const title = shortenProductName(product.name, product.brand);
  const category = getCategoryLabel(guessCategory(product.name, product.ingredients));

  function finish(trackingEnabled: boolean, trialDays?: number) {
    onComplete({
      trackingEnabled,
      trialDays,
      usageTime,
      timesPerWeek,
    });
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.screen }]}>
          <View style={styles.productRow}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
            <View style={styles.productMeta}>
              <Text style={styles.productName} numberOfLines={2}>
                {title}
              </Text>
              {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
              <Text style={styles.category}>{category}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {step === 'usage' ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>When do you use it?</Text>
                <View style={styles.pillRow}>
                  {USAGE_TIME_OPTIONS.map((option) => {
                    const selected = usageTime === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[styles.pill, selected && styles.pillSelected]}
                        onPress={() => setUsageTime(option.value)}
                      >
                        <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Times per week</Text>
                <View style={styles.daysRow}>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const selected = timesPerWeek === day;
                    return (
                      <Pressable
                        key={day}
                        style={[styles.dayCircle, selected && styles.dayCircleSelected]}
                        onPress={() => setTimesPerWeek(day)}
                      >
                        <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
                          {day}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable style={styles.primaryBtn} onPress={() => onStepChange('ask')}>
                <Text style={styles.primaryBtnText}>Continue</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'ask' ? (
            <>
              <Text style={styles.question}>Do you want to track this product?</Text>
              <Text style={styles.hint}>
                Tracking compares your scans over a set period to see if it helps.
              </Text>
              <Pressable style={styles.primaryBtn} onPress={() => onStepChange('duration')}>
                <Text style={styles.primaryBtnText}>Yes, track it</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => finish(false)}>
                <Text style={styles.secondaryBtnText}>No, just add to shelf</Text>
              </Pressable>
              <Pressable onPress={() => onStepChange('usage')}>
                <Text style={styles.back}>Back</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'duration' ? (
            <>
              <Text style={styles.question}>How long do you want to track it?</Text>
              <Text style={styles.hint}>Pick a trial duration.</Text>
              {TRACK_DURATION_OPTIONS.map((option) => (
                <Pressable
                  key={option.days}
                  style={styles.durationBtn}
                  onPress={() => finish(true, option.days)}
                >
                  <Text style={styles.durationLabel}>{option.label}</Text>
                  <Text style={styles.durationDays}>{option.days} days</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => onStepChange('ask')}>
                <Text style={styles.back}>Back</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.screen,
    gap: spacing.item,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  thumbPlaceholder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  productMeta: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
  },
  productName: {
    ...font.semibold,
    fontSize: 17,
    color: colors.text,
    textAlign: 'left',
  },
  brand: {
    ...type.bodySmall,
    textAlign: 'left',
  },
  category: {
    ...font.medium,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    paddingTop: 2,
    paddingLeft: 4,
  },
  closeText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  section: {
    gap: 10,
    marginTop: spacing.inner,
  },
  sectionLabel: {
    ...font.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  pillSelected: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  pillText: {
    ...font.medium,
    fontSize: 14,
    color: colors.text,
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dayCircleSelected: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  dayText: {
    ...font.medium,
    fontSize: 15,
    color: colors.text,
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  question: {
    ...font.semibold,
    fontSize: 17,
    color: colors.text,
    marginTop: spacing.inner,
  },
  hint: {
    ...type.bodySmall,
    marginTop: -4,
  },
  primaryBtn: {
    backgroundColor: colors.dark,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.inner,
  },
  primaryBtnText: {
    ...font.semibold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...font.semibold,
    fontSize: 15,
    color: colors.text,
  },
  durationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  durationLabel: {
    ...font.medium,
    fontSize: 16,
    color: colors.text,
  },
  durationDays: {
    ...type.caption,
  },
  back: {
    ...font.medium,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
