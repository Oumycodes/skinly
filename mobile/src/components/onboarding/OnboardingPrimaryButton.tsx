import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { type } from '../../constants/typography';

interface OnboardingPrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function OnboardingPrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
}: OnboardingPrimaryButtonProps) {
  return (
    <Pressable
      style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.fab,
    borderRadius: radii.pill,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  label: {
    ...type.button,
  },
});
