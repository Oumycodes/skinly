import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { font, type } from '../constants/typography';
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
          <Text style={styles.products}>
            {conflict.products.join(' · ')}
            {conflict.when ? ` · ${conflict.when}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF4E5',
    borderRadius: radii.sm,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F5D9A8',
    gap: spacing.item,
  },
  title: {
    ...font.bold,
    fontSize: 14,
    color: colors.warning,
  },
  item: {
    gap: 2,
  },
  severity: {
    ...type.statLabel,
  },
  message: {
    ...type.bodySmall,
    color: colors.text,
  },
  products: {
    ...type.caption,
    marginTop: 2,
  },
});
