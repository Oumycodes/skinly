import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import type { ConflictResult } from '../../services/products';

interface ConflictAlertProps {
  conflicts: ConflictResult;
}

export function ConflictAlert({ conflicts }: ConflictAlertProps) {
  if (!conflicts.has_conflicts) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>⚠</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {conflicts.conflicts.length} mix warning
            {conflicts.conflicts.length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.subtitle}>
            These products are used at the same time and may clash.
          </Text>
        </View>
      </View>

      {conflicts.conflicts.map((conflict, index) => (
        <View
          key={`${conflict.products.join('-')}-${index}`}
          style={[styles.item, index > 0 && styles.itemBorder]}
        >
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
    backgroundColor: colors.accent.peach,
    borderRadius: radii.md,
    padding: 16,
    gap: spacing.item,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.item,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    color: colors.accent.terracotta,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...type.cardTitle,
    fontSize: 14,
  },
  subtitle: {
    ...type.bodySmall,
  },
  item: {
    gap: 2,
    paddingTop: 4,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 10,
  },
  severity: {
    ...font.semibold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.accent.terracotta,
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
