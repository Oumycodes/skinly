import { useCallback, useRef } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';

import { MeasureIcon } from '../ui/MeasureIcon';
import { cardChrome } from '../../constants/cards';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import { MEASURE_LIST_LABEL, type SkinMeasure } from '../../utils/skinMeasures';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.screen * 2 - spacing.inner;
const CARD_GAP = spacing.item;
const CHIP_GAP = 6;
const CHIP_VISIBLE_COUNT = 2.5;
const CHIP_ROW_WIDTH = SCREEN_WIDTH - spacing.screen;
const CHIP_WIDTH = (CHIP_ROW_WIDTH - CHIP_GAP * 2) / CHIP_VISIBLE_COUNT;
/** Keeps gap to the suggestions box uniform across measures. */
const MEASURE_CARD_MIN_HEIGHT = 154;

interface SkinMeasureCarouselProps {
  measures: SkinMeasure[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

function statusColor(status: SkinMeasure['status']): string {
  if (status === 'good') return colors.success;
  return colors.severity[status];
}

function measureScoreTen(healthScore: number): string {
  return (healthScore / 10).toFixed(1);
}

export function SkinMeasureCarousel({
  measures,
  activeIndex,
  onActiveIndexChange,
}: SkinMeasureCarouselProps) {
  const listRef = useRef<FlatList<SkinMeasure>>(null);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
      if (index >= 0 && index < measures.length && index !== activeIndex) {
        onActiveIndexChange(index);
      }
    },
    [activeIndex, measures.length, onActiveIndexChange],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      onActiveIndexChange(index);
      listRef.current?.scrollToOffset({
        offset: index * (CARD_WIDTH + CARD_GAP),
        animated: true,
      });
    },
    [onActiveIndexChange],
  );

  const renderItem: ListRenderItem<SkinMeasure> = useCallback(
    ({ item }) => (
      <View style={[styles.card, { width: CARD_WIDTH }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleGroup}>
            <MeasureIcon id={item.id} size="md" />
            <Text style={styles.measureName} numberOfLines={1}>
              {MEASURE_LIST_LABEL[item.id]}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor(item.status)}18` }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
              {item.statusLabel}
            </Text>
          </View>
        </View>

        <Text style={styles.brief} numberOfLines={3}>
          {item.brief}
        </Text>
      </View>
    ),
    [],
  );

  return (
    <View>
      <View style={styles.chipRowClip}>
        <ScrollChipRow measures={measures} activeIndex={activeIndex} onSelect={scrollToIndex} />
      </View>

      <FlatList
        ref={listRef}
        data={measures}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={[styles.listContent, styles.listContentAlign]}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
    </View>
  );
}

function ScrollChipRow({
  measures,
  activeIndex,
  onSelect,
}: {
  measures: SkinMeasure[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <FlatList
      data={measures}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      snapToInterval={CHIP_WIDTH + CHIP_GAP}
      decelerationRate="fast"
      renderItem={({ item, index }) => (
        <Pressable
          style={[
            styles.chip,
            { width: CHIP_WIDTH },
            index === activeIndex && styles.chipActive,
          ]}
          onPress={() => onSelect(index)}
        >
          <MeasureIcon id={item.id} />
          <View style={styles.chipText}>
            <Text
              style={[styles.chipLabel, index === activeIndex && styles.chipLabelActive]}
              numberOfLines={1}
            >
              {MEASURE_LIST_LABEL[item.id]}
            </Text>
            <Text
              style={[
                styles.chipScore,
                { color: statusColor(item.status) },
              ]}
            >
              {item.healthScore > 0 ? measureScoreTen(item.healthScore) : '—'}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  chipRowClip: {
    marginRight: -spacing.screen,
    overflow: 'hidden',
  },
  chips: {
    gap: CHIP_GAP,
    paddingBottom: 14,
    paddingRight: spacing.screen,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.inner,
    paddingVertical: spacing.inner,
    ...cardChrome,
    borderRadius: radii.pill,
  },
  chipText: {
    flex: 1,
    gap: 2,
  },
  chipActive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  chipLabel: {
    ...font.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.text,
  },
  chipScore: {
    ...font.bold,
    fontSize: 12,
    lineHeight: 14,
  },
  listContent: {
    gap: CARD_GAP,
    paddingRight: spacing.inner / 2,
  },
  listContentAlign: {
    alignItems: 'flex-start',
  },
  card: {
    ...cardChrome,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.section,
    paddingVertical: spacing.screen,
    alignSelf: 'flex-start',
    minHeight: MEASURE_CARD_MIN_HEIGHT,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.inner,
    marginBottom: spacing.inner,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.inner,
    flex: 1,
    minWidth: 0,
  },
  measureName: {
    ...type.cardTitle,
    flexShrink: 1,
  },
  statusPill: {
    flexShrink: 0,
    paddingHorizontal: spacing.item,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  statusText: {
    ...font.semibold,
    fontSize: 12,
  },
  brief: {
    ...type.body,
  },
});
