import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';

interface HomeHeaderProps {
  streak?: number;
}

export function HomeHeader({ streak = 0 }: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🌿</Text>
        </View>
        <Text style={styles.logoText}>Skinly</Text>
      </View>

      {streak > 0 && (
        <View style={styles.streak}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakCount}>{streak}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 14,
  },
  logoText: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.5,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakCount: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.text,
  },
});
