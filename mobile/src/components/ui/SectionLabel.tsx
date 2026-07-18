import { StyleSheet, Text } from 'react-native';

import { type } from '../../constants/typography';

interface SectionLabelProps {
  label: string;
}

export function SectionLabel({ label }: SectionLabelProps) {
  return <Text style={styles.label}>{label}</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...type.statLabel,
  },
});
