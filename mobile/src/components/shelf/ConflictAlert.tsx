import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import type { ConflictResult } from '../../services/products';

interface ConflictAlertProps {
  conflicts: ConflictResult;
}

export function ConflictAlert({ conflicts }: ConflictAlertProps) {
  if (!conflicts.has_conflicts) return null;

  const first = conflicts.conflicts[0];

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>⚠</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>
          {conflicts.conflicts.length} conflict{conflicts.conflicts.length > 1 ? 's' : ''} on your shelf
        </Text>
        <Text style={styles.message}>{first.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.accent.peach,
    borderRadius: radii.md,
    padding: 16,
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
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.text,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
