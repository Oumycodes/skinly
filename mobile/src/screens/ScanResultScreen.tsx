import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiagnosisCard } from '../components/DiagnosisCard';
import { colors } from '../constants/colors';
import type { ScanStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ScanStackParamList, 'ScanResult'>;

export function ScanResultScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { result } = route.params;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Your results</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Skin health score</Text>
          <Text style={styles.scoreValue}>{result.overall_score}</Text>
          <Text style={styles.scoreSummary}>{result.summary}</Text>
        </View>

        <Text style={styles.sectionTitle}>
          {result.conditions.length === 1
            ? '1 condition detected'
            : `${result.conditions.length} conditions detected`}
        </Text>

        {result.conditions.map((condition) => (
          <DiagnosisCard key={condition.name} condition={condition} />
        ))}

        <Pressable style={styles.rescanButton} onPress={() => navigation.goBack()}>
          <Text style={styles.rescanButtonText}>Scan again</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    width: 72,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 72,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  scoreCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.surface,
    lineHeight: 64,
  },
  scoreSummary: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 4,
  },
  rescanButton: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rescanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
