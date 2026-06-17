import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface DateStripProps {
  selectedDate?: Date;
}

export function DateStrip({ selectedDate = new Date() }: DateStripProps) {
  const today = new Date();
  const weekStart = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <View style={styles.container}>
      {days.map((day) => {
        const isToday = isSameDay(day, today);
        const isPast = day < today && !isToday;

        return (
          <View key={day.toISOString()} style={styles.dayCol}>
            <Text style={styles.dayLabel}>{DAY_LABELS[day.getDay()]}</Text>
            <View
              style={[
                styles.dayCircle,
                isPast && styles.dayCirclePast,
                isToday && styles.dayCircleToday,
                !isPast && !isToday && styles.dayCircleFuture,
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  isPast && styles.dayNumberPast,
                  isToday && styles.dayNumberToday,
                  !isPast && !isToday && styles.dayNumberFuture,
                ]}
              >
                {day.getDate()}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCirclePast: {
    backgroundColor: colors.primaryLight,
  },
  dayCircleToday: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayCircleFuture: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  dayNumber: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
  },
  dayNumberPast: {
    color: colors.primaryDark,
  },
  dayNumberToday: {
    color: colors.text,
  },
  dayNumberFuture: {
    color: colors.textMuted,
  },
});
