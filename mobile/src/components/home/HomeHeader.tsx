import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { type } from '../../constants/typography';

interface HomeHeaderProps {
  streak?: number;
}

export function HomeHeader({ streak = 0 }: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.logoText}>skins</Text>
      </View>

      {streak > 0 && (
        <View style={styles.streak}>
          <Ionicons name="flame" size={14} color={colors.streak} />
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
  },
  logoText: {
    ...type.screenTitle,
    fontSize: 24,
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
  streakCount: {
    ...type.label,
    color: colors.text,
  },
});
