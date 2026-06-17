import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateStrip } from '../components/home/DateStrip';
import { HomeHeader } from '../components/home/HomeHeader';
import { MetricGrid } from '../components/home/MetricGrid';
import { RoutinePreviewCard } from '../components/home/RoutinePreviewCard';
import { SkinScoreCard } from '../components/home/SkinScoreCard';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';
import { useDashboard } from '../hooks/useDashboard';
import type { RootStackParamList } from '../navigation/types';
import { getRoutine } from '../services/routine';
import {
  dashboardMetricsToGrid,
  formatRoutinePreview,
  getCurrentPeriod,
} from '../utils/dashboard';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, loading, refresh } = useDashboard();
  const period = getCurrentPeriod();
  const [routinePreview, setRoutinePreview] = useState<{
    steps: number;
    preview: string;
    status: 'READY' | 'INCOMPLETE';
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      getRoutine(period)
        .then((r) =>
          setRoutinePreview({
            steps: r.steps.length,
            preview: formatRoutinePreview(r.steps),
            status: r.status,
          }),
        )
        .catch(() => setRoutinePreview(null));
    }, [refresh, period]),
  );

  const metrics = data ? dashboardMetricsToGrid(data.metrics) : [];
  const hasScan = (data?.skin_score ?? 0) > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
      >
        <HomeHeader streak={data?.streak ?? 0} />
        <DateStrip />

        {loading && !data ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <SkinScoreCard
              score={hasScan ? data!.skin_score : 0}
              weeklyChange={data?.weekly_change ?? 0}
            />
            <MetricGrid metrics={metrics} />

            {!hasScan && (
              <Pressable
                style={styles.cta}
                onPress={() => navigation.navigate('ScanFlow')}
              >
                <Text style={styles.ctaText}>Take your first skin scan →</Text>
              </Pressable>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's routine</Text>
              <Pressable onPress={() => navigation.navigate('Routine')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>

            <RoutinePreviewCard
              period={period}
              stepCount={routinePreview?.steps ?? 0}
              stepsPreview={routinePreview?.preview ?? 'Build your routine from your shelf'}
              status={routinePreview?.status === 'READY' ? 'READY' : 'PENDING'}
              onPress={() => navigation.navigate('Routine')}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: fonts.serifRegular,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  cta: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.primaryDark,
  },
});
