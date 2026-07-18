import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { colors } from '../constants/colors';
import { OnboardingProvider, useOnboardingFlow } from '../context/OnboardingProvider';
import { syncOnboardingRoutineToAccount } from '../lib/onboarding/syncOnboardingRoutine';
import { useAuth } from '../lib/auth/AuthProvider';
import { AuthNavigator } from '../navigation/AuthNavigator';
import { OnboardingNavigator } from '../navigation/OnboardingNavigator';

function AuthGateContent({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { complete } = useOnboardingFlow();

  useEffect(() => {
    if (!user) return;
    void syncOnboardingRoutineToAccount().catch(() => {
      // Shelf/routine sync can fail offline — onboarding answers remain stored locally.
    });
  }, [user]);

  if (loading || complete === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Quiz / intro first
  if (!complete) {
    return <OnboardingNavigator />;
  }

  // Scans, shelf, and routines require a real session
  if (!user) {
    return <AuthNavigator />;
  }

  return <>{children}</>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <OnboardingProvider>
      <AuthGateContent>{children}</AuthGateContent>
    </OnboardingProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
