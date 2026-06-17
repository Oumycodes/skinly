import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';

interface SectionLabelProps {
  label: string;
}

export function SectionLabel({ label }: SectionLabelProps) {
  return (
    <Text style={styles.label}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
