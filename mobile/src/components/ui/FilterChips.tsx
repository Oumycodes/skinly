import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';

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
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.text,
  },
  labelActive: {
    color: colors.surface,
  },
});
