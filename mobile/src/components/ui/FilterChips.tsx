import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { cardChrome } from '../../constants/cards';
import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font } from '../../constants/typography';

export interface FilterOption {
  id: string;
  label: string;
  icon?: string;
}

interface FilterChipsProps {
  options: FilterOption[];
  selected: string;
  onSelect: (id: string) => void;
}

export function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const active = option.id === selected;
        return (
          <Pressable
            key={option.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(option.id)}
          >
            {option.icon && <Text style={[styles.icon, active && styles.iconActive]}>{option.icon}</Text>}
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.inner,
    paddingRight: spacing.inner,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: spacing.item,
    ...cardChrome,
    borderRadius: radii.full,
  },
  chipActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  icon: {
    fontSize: 13,
  },
  iconActive: {
    color: colors.surface,
  },
  label: {
    ...font.medium,
    fontSize: 13,
    color: colors.text,
  },
  labelActive: {
    color: colors.surface,
  },
});
