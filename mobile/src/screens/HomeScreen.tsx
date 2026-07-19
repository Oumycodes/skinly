import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FaceAnalysisPanel } from '../components/home/FaceAnalysisPanel';
import { HomeHeader } from '../components/home/HomeHeader';
import { RoutinePreviewCard } from '../components/home/RoutinePreviewCard';
import { SectionTitle } from '../components/ui/SectionTitle';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';
import { spacing } from '../constants/spacing';
import { useDashboard } from '../hooks/useDashboard';
import type { RootStackParamList } from '../navigation/types';
import { dashboardImages } from '../services/dashboard';
import { getRoutine } from '../services/routine';
import { formatRoutinePreview, getCurrentPeriod } from '../utils/dashboard';

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
  const [photoZoomed, setPhotoZoomed] = useState(false);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top + layout.screenPaddingTop }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={!photoZoomed}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + layout.tabScrollBottom }]}
      >
        <HomeHeader streak={data?.streak ?? 0} />

        {loading && !data ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <FaceAnalysisPanel
              imageUrls={data ? dashboardImages(data) : {}}
              overallScore={data?.skin_score ?? 0}
              summary={data?.latest_scan_summary ?? ''}
              conditions={data?.latest_scan_conditions ?? []}
              metricInsights={data?.latest_metric_insights}
              smoothedScores={data?.latest_metrics_smoothed}
              onScanPress={() => navigation.navigate('ScanFlow')}
              onZoomChange={setPhotoZoomed}
            />

            <View>
              <SectionTitle
                title="Today's routine"
                actionLabel="See all"
                onAction={() => navigation.navigate('Routine')}
              />
              <RoutinePreviewCard
                period={period}
                stepCount={routinePreview?.steps ?? 0}
                stepsPreview={routinePreview?.preview ?? 'Build your routine from your shelf'}
                status={routinePreview?.status === 'READY' ? 'READY' : 'PENDING'}
                onPress={() => navigation.navigate('Routine')}
              />
            </View>
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
    ...layout.content,
  },
});
