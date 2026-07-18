import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeHeader } from '../components/home/HomeHeader';
import { SectionLabel } from '../components/ui/SectionLabel';
import { sharedCardStyles } from '../constants/cards';
import { colors } from '../constants/colors';
import { layout } from '../constants/layout';
import { spacing } from '../constants/spacing';
import { type } from '../constants/typography';
import { useScanQuota } from '../hooks/useScanQuota';
import { useDashboard } from '../hooks/useDashboard';
import { useOnboardingFlow } from '../context/OnboardingProvider';
import { useAuth } from '../lib/auth/AuthProvider';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { resetOnboarding } = useOnboardingFlow();
  const { quota } = useScanQuota();
  const { data: dashboard } = useDashboard();

  return (
    <View style={[styles.container, { paddingTop: insets.top + layout.screenPaddingTop }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + layout.tabScrollBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader streak={dashboard?.streak ?? 0} />

        <SectionLabel label="Profile" />
        <Text style={styles.title}>Account</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Email</Text>
          <Text style={styles.cardValue}>{user?.email ?? '—'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Plan</Text>
          <Text style={styles.cardValue}>{quota?.plan === 'pro' ? 'Pro' : 'Free'}</Text>
          {quota?.plan === 'free' && quota.limit > 0 && (
            <Text style={styles.cardHint}>
              {quota.remaining} of {quota.limit} scans remaining
            </Text>
          )}
        </View>

        <Pressable style={styles.signOutWrap} onPress={() => void resetOnboarding()}>
          <Text style={styles.replayOnboarding}>Replay onboarding</Text>
        </Pressable>

        {user ? (
          <Pressable style={styles.signOutWrap} onPress={signOut}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        ) : null}
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
  title: {
    ...type.sectionTitle,
    marginTop: spacing.inner,
  },
  card: {
    ...sharedCardStyles.surfaceCard,
    gap: 4,
  },
  cardLabel: {
    ...type.statLabel,
  },
  cardValue: {
    ...type.cardTitle,
  },
  cardHint: {
    ...type.bodySmall,
    marginTop: 4,
  },
  signOutWrap: {
    alignItems: 'center',
    marginTop: spacing.titleBelow,
  },
  replayOnboarding: {
    ...type.link,
  },
  signOut: {
    ...type.link,
    color: colors.error,
  },
});
