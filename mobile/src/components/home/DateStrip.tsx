import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font } from '../../constants/typography';
import { scoreDayColors, noScoreDayColors } from '../../utils/scoreColors';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_SLOT_HEIGHT = 44;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateKeyFromIso(iso: string): string {
  return dateKey(new Date(iso));
}

function scoreToTen(score: number): string {
  return (score / 10).toFixed(1);
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${MONTH_LABELS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  }
  return `${MONTH_LABELS[weekStart.getMonth()].slice(0, 3)} – ${MONTH_LABELS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`;
}

interface DateStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  scanScores?: Map<string, number>;
}

interface WeekDaysProps {
  weekStart: Date;
  selectedDate: Date;
  today: Date;
  scanScores?: Map<string, number>;
  onSelectDate: (date: Date) => void;
}

const WeekDays = memo(function WeekDays({
  weekStart,
  selectedDate,
  today,
  scanScores,
  onSelectDate,
}: WeekDaysProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <View style={styles.container}>
      {days.map((day) => {
        const isToday = isSameDay(day, today);
        const isSelected = isSameDay(day, selectedDate);
        const isFuture = day > today && !isToday;
        const dayScore = scanScores?.get(dateKey(day));
        const hasScore = dayScore != null && !isFuture;
        const scoredColors = hasScore ? scoreDayColors(dayScore) : null;
        const dayColors = scoredColors ?? noScoreDayColors;

        const circleBg = isSelected
          ? hasScore && scoredColors
            ? scoredColors.border
            : noScoreDayColors.selectedBackground
          : dayColors.background;
        const circleBorder = hasScore && scoredColors
          ? scoredColors.border
          : dayColors.border;
        const numberColor = isFuture
          ? colors.textMuted
          : isSelected
            ? hasScore && scoredColors
              ? scoredColors.selectedNumber
              : noScoreDayColors.selectedNumber
            : dayColors.number;

        return (
          <Pressable
            key={dateKey(day)}
            style={styles.dayCol}
            onPress={() => onSelectDate(day)}
            disabled={isFuture}
          >
            <Text style={styles.dayLabel}>{DAY_LABELS[day.getDay()]}</Text>

            <View
              style={[
                styles.dayCircle,
                isFuture && styles.dayCircleFuture,
                !isFuture && {
                  backgroundColor: circleBg,
                  borderColor: circleBorder,
                },
                !isSelected && isToday && styles.dayCircleToday,
              ]}
            >
              <Text style={[styles.dayNumber, { color: numberColor }]}>
                {day.getDate()}
              </Text>
              {hasScore && scoredColors ? (
                <Text
                  style={[
                    styles.dayScoreInside,
                    isSelected
                      ? { color: scoredColors.selectedScore }
                      : { color: scoredColors.score },
                  ]}
                >
                  {scoreToTen(dayScore)}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

export function DateStrip({ selectedDate, onSelectDate, scanScores }: DateStripProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekStart = startOfWeek(selectedDate);
  const currentWeekStart = startOfWeek(today);
  const canGoForward = weekStart < currentWeekStart;

  const prevWeekStart = addDays(weekStart, -7);
  const nextWeekStart = addDays(weekStart, 7);

  const scrollRef = useRef<ScrollView>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const isResetting = useRef(false);
  const slideWidthRef = useRef(slideWidth);
  slideWidthRef.current = slideWidth;

  const canGoForwardRef = useRef(canGoForward);
  canGoForwardRef.current = canGoForward;

  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const onSelectDateRef = useRef(onSelectDate);
  onSelectDateRef.current = onSelectDate;

  const centerScroll = useCallback((animated = false) => {
    const width = slideWidthRef.current;
    if (width > 0) {
      scrollRef.current?.scrollTo({ x: width, animated });
    }
  }, []);

  useLayoutEffect(() => {
    centerScroll(false);
    isResetting.current = false;
  }, [weekStart.getTime(), centerScroll]);

  const handlePageSettled = useCallback((offsetX: number) => {
    if (isResetting.current) return;

    const width = slideWidthRef.current;
    if (width <= 0) return;

    const page = Math.round(offsetX / width);
    if (page === 1) return;

    if (page === 2 && !canGoForwardRef.current) {
      centerScroll(true);
      return;
    }

    isResetting.current = true;
    const deltaDays = page === 0 ? -7 : 7;
    onSelectDateRef.current(addDays(selectedDateRef.current, deltaDays));
  }, [centerScroll]);

  const onScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocityX = event.nativeEvent.velocity?.x ?? 0;
      if (Math.abs(velocityX) < 0.05) {
        handlePageSettled(event.nativeEvent.contentOffset.x);
      }
    },
    [handlePageSettled],
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handlePageSettled(event.nativeEvent.contentOffset.x);
    },
    [handlePageSettled],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.weekHeader}>
        <Text style={styles.weekLabel}>{formatWeekLabel(weekStart)}</Text>
      </View>

      <View
        style={styles.slideViewport}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (width > 0 && width !== slideWidth) {
            setSlideWidth(width);
          }
        }}
      >
        {slideWidth > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            directionalLockEnabled
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            removeClippedSubviews
            contentOffset={{ x: slideWidth, y: 0 }}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
          >
            <View style={[styles.slidePage, { width: slideWidth }]}>
              <WeekDays
                weekStart={prevWeekStart}
                selectedDate={selectedDate}
                today={today}
                scanScores={scanScores}
                onSelectDate={onSelectDate}
              />
            </View>
            <View style={[styles.slidePage, { width: slideWidth }]}>
              <WeekDays
                weekStart={weekStart}
                selectedDate={selectedDate}
                today={today}
                scanScores={scanScores}
                onSelectDate={onSelectDate}
              />
            </View>
            <View style={[styles.slidePage, { width: slideWidth }]}>
              <WeekDays
                weekStart={nextWeekStart}
                selectedDate={selectedDate}
                today={today}
                scanScores={scanScores}
                onSelectDate={onSelectDate}
              />
            </View>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

export { addDays, dateKey, dateKeyFromIso, isSameDay, startOfWeek };

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.titleBelow,
  },
  weekHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.inner,
  },
  weekLabel: {
    ...font.semibold,
    fontSize: 15,
    color: colors.text,
  },
  slideViewport: {
    overflow: 'hidden',
  },
  slidePage: {
    flexShrink: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.inner / 2,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.inner,
  },
  dayLabel: {
    ...font.semibold,
    fontSize: 11,
    lineHeight: 13,
    height: 13,
    color: colors.textMuted,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  dayCircle: {
    width: 40,
    height: DAY_SLOT_HEIGHT,
    borderRadius: radii.full,
    borderWidth: 1.5,
    position: 'relative',
  },
  dayCircleFuture: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  dayCircleToday: {
    borderWidth: 2,
  },
  dayNumber: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    ...font.semibold,
    fontSize: 13,
    lineHeight: 14,
  },
  dayScoreInside: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    textAlign: 'center',
    ...font.semibold,
    fontSize: 9,
    lineHeight: 10,
  },
});
