import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { type } from '../../constants/typography';

interface SectionTitleProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionTitle({ title, actionLabel, onAction }: SectionTitleProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.titleBelow,
  },
  title: {
    ...type.sectionTitle,
  },
  action: {
    ...type.bodySmall,
    color: colors.textSecondary,
  },
});
