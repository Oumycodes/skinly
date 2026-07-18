import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font } from '../../constants/typography';
import type { OnboardingOption } from '../../constants/onboarding';

interface OnboardingOptionCardProps {
  option: OnboardingOption;
  selected: boolean;
  onPress: () => void;
}

export function OnboardingOptionCard({ option, selected, onPress }: OnboardingOptionCardProps) {
  const iconColor = selected ? '#FFFFFF' : colors.text;

  return (
    <Pressable
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
    >
      <View style={styles.left}>
        {option.ionicon ? (
          <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
            <Ionicons
              name={option.ionicon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={iconColor}
            />
          </View>
        ) : null}
        <View style={styles.textGroup}>
          <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          {option.description ? (
            <Text style={[styles.description, selected && styles.descriptionSelected]}>
              {option.description}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 18,
    paddingHorizontal: spacing.screen,
  },
  cardSelected: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.item,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  labelSelected: {
    color: '#FFFFFF',
  },
  description: {
    ...font.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  descriptionSelected: {
    color: 'rgba(255,255,255,0.75)',
  },
});
