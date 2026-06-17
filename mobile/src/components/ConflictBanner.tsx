import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import type { ConflictResult } from '../services/products';

interface ConflictBannerProps {
  conflicts: ConflictResult;
}

export function ConflictBanner({ conflicts }: ConflictBannerProps) {
  if (!conflicts.has_conflicts) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠ Ingredient conflicts detected</Text>
      {conflicts.conflicts.map((conflict) => (
        <View key={conflict.message} style={styles.item}>
          <Text style={styles.severity}>{conflict.severity.toUpperCase()}</Text>
          <Text style={styles.message}>{conflict.message}</Text>
          <Text style={styles.products}>{conflict.products.join(' · ')}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5D9A8',
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
  },
  item: {
    gap: 2,
  },
  severity: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  products: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
