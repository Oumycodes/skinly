import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeHeader } from '../components/home/HomeHeader';
import { SectionLabel } from '../components/ui/SectionLabel';
import { colors, radii } from '../constants/colors';
import { fonts } from '../constants/typography';
import { useScanQuota } from '../hooks/useScanQuota';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../lib/auth/AuthProvider';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { quota } = useScanQuota();
  const { data: dashboard } = useDashboard();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
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
          {quota?.plan === 'free' && (
            <Text style={styles.cardHint}>
              {quota.remaining} of {quota.limit} scans remaining
            </Text>
          )}
        </View>

        <Pressable style={styles.signOutWrap} onPress={signOut}>
          <Text style={styles.signOut}>Sign out</Text>
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
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 18,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardValue: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  cardHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  signOutWrap: {
    alignItems: 'center',
    marginTop: 12,
  },
  signOut: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.error,
  },
});
