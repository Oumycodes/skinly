import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
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

import { HomeHeader } from '../components/home/HomeHeader';
import { ComparisonCard } from '../components/progress/ComparisonCard';
import { ProgressChartCard } from '../components/progress/ProgressChartCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import { colors, radii } from '../constants/colors';
import { fonts } from '../constants/typography';
import { useProgress } from '../hooks/useProgress';
import { submitCheckin } from '../services/progress';

export function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { data, loading, refresh } = useProgress();
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function handleCheckin() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
      cameraType: ImagePicker.CameraType.front,
    });

    if (result.canceled || !result.assets[0]) return;

    setCheckingIn(true);
    setError(null);
    try {
      await submitCheckin(result.assets[0].uri);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  }

  const weeksLabel =
    data && data.weeks_active > 0
      ? data.weeks_active === 1
        ? 'One week in.'
        : `${data.weeks_active} weeks in.`
      : 'Start tracking';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
      >
        <HomeHeader streak={data?.streak ?? 0} />

        <SectionLabel label="Progress" />
        <Text style={styles.title}>{weeksLabel}</Text>
        {data && data.weeks_active > 0 ? (
          <Text style={styles.subtitle}>
            Your skin is{' '}
            {data.total_change >= 0 ? 'up' : 'down'}{' '}
            <Text style={styles.bold}>
              {Math.abs(data.total_change)} points
            </Text>{' '}
            since you started.
          </Text>
        ) : (
          <Text style={styles.subtitle}>
            Take weekly selfies to track your skin score over time.
          </Text>
        )}

        {loading && !data ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <>
            <ProgressChartCard
              score={data?.current_score ?? 0}
              change={data?.total_change ?? 0}
              chartPoints={data?.chart_points}
            />

            {data && data.weeks_active > 0 && (
              <View style={styles.comparisonRow}>
                <ComparisonCard score={data.starting_score} variant="before" />
                <ComparisonCard score={data.current_score} variant="after" />
              </View>
            )}

            <Pressable
              style={[styles.checkinBtn, checkingIn && styles.checkinBtnDisabled]}
              onPress={handleCheckin}
              disabled={checkingIn}
            >
              {checkingIn ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.checkinText}>📷 Weekly check-in</Text>
              )}
            </Pressable>

            {error && <Text style={styles.error}>{error}</Text>}
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
    gap: 16,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  bold: {
    fontFamily: fonts.sansSemiBold,
    color: colors.text,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkinBtn: {
    backgroundColor: colors.dark,
    borderRadius: radii.full,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  checkinBtnDisabled: {
    opacity: 0.7,
  },
  checkinText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.surface,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
  },
});
