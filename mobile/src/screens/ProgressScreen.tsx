import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dateKey, dateKeyFromIso, DateStrip } from '../components/home/DateStrip';
import { HomeHeader } from '../components/home/HomeHeader';
import { LatestScanPanel } from '../components/scan/LatestScanPanel';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';
import { spacing } from '../constants/spacing';
import { type } from '../constants/typography';
import { useDashboard } from '../hooks/useDashboard';
import type { RootStackParamList } from '../navigation/types';
import {
  dashboardImages,
  getScanHistoryDetail,
  scanDetailImages,
  type ScanDetail,
} from '../services/dashboard';
import { withSampleScanScores } from '../utils/sampleProgressScores';

export function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: dashboard, refresh: refreshDashboard } = useDashboard();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [history, setHistory] = useState<ScanDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [details] = await Promise.all([
        getScanHistoryDetail(90),
        refreshDashboard(),
      ]);
      setHistory(details);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [refreshDashboard]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const scanScores = useMemo(() => {
    const scores = new Map<string, number>();
    // History is newest-first — keep the latest score per calendar day
    for (const scan of history) {
      const key = dateKeyFromIso(scan.scanned_at);
      if (!scores.has(key)) {
        scores.set(key, scan.overall_score);
      }
    }
    if (dashboard?.skin_score && dashboard.skin_score > 0) {
      const key = dashboard.latest_scan_at
        ? dateKeyFromIso(dashboard.latest_scan_at)
        : dateKey(new Date());
      if (!scores.has(key)) {
        scores.set(key, dashboard.skin_score);
      }
    }
    return withSampleScanScores(scores);
  }, [history, dashboard]);

  const selectedScan = useMemo(() => {
    const key = dateKey(selectedDate);
    return history.find((s) => dateKeyFromIso(s.scanned_at) === key) ?? null;
  }, [history, selectedDate]);

  const todayKey = dateKey(new Date());
  const isToday = dateKey(selectedDate) === todayKey;

  const displayScan = selectedScan ?? (isToday && dashboard?.skin_score ? {
    overall_score: dashboard.skin_score,
    summary: dashboard.latest_scan_summary ?? '',
    conditions: dashboard.latest_scan_conditions,
    image_urls: dashboard.latest_scan_image_urls,
    metric_insights: dashboard.latest_metric_insights,
    metrics_smoothed: dashboard.latest_metrics_smoothed,
    trend_note: dashboard.latest_trend_note,
  } : null);

  const imageUrls = selectedScan
    ? scanDetailImages(selectedScan)
    : dashboard
      ? dashboardImages(dashboard)
      : {};

  return (
    <View style={[styles.container, { paddingTop: insets.top + layout.screenPaddingTop }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + layout.tabScrollBottom }]}
      >
        <HomeHeader streak={dashboard?.streak ?? 0} />

        <DateStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          scanScores={scanScores}
        />

        {loading && history.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : displayScan ? (
          <LatestScanPanel
            score={displayScan.overall_score}
            summary={displayScan.summary}
            imageUrls={imageUrls}
            conditions={displayScan.conditions ?? []}
            metricInsights={displayScan.metric_insights}
            smoothedScores={displayScan.metrics_smoothed}
            variant="detail"
            onScanPress={() => navigation.navigate('ScanFlow')}
          />
        ) : (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyTitle}>No scan this day</Text>
            <Text style={styles.emptyBody}>
              {isToday
                ? 'Take a scan to see your analysis here.'
                : 'No skin scan was recorded on this date.'}
            </Text>
          </View>
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
  emptyDay: {
    alignItems: 'center',
    gap: spacing.inner,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    ...type.sectionTitle,
  },
  emptyBody: {
    ...type.bodySmall,
    textAlign: 'center',
  },
});
