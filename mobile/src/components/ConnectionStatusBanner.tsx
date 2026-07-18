import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { type } from '../constants/typography';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

type CheckState = 'checking' | 'ok' | 'api' | 'supabase' | 'both';

async function canReach(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

/** Supabase auth health returns 401 without a key — any HTTP response means the project is up */
async function canReachSupabase(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/auth/v1/health`, { method: 'GET' });
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  }
}

export function ConnectionStatusBanner() {
  const [state, setState] = useState<CheckState>('checking');

  useEffect(() => {
    let cancelled = false;

    async function runChecks() {
      const [apiOk, supabaseOk] = await Promise.all([
        canReach(`${API_URL}/health`),
        SUPABASE_URL ? canReachSupabase(SUPABASE_URL) : Promise.resolve(false),
      ]);

      if (cancelled) return;

      if (apiOk && supabaseOk) {
        setState('ok');
        return;
      }
      if (!apiOk && !supabaseOk) setState('both');
      else if (!apiOk) setState('api');
      else setState('supabase');
    }

    runChecks();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'checking' || state === 'ok') return null;

  const message =
    state === 'both'
      ? `Cannot reach backend (${API_URL}) or Supabase (${SUPABASE_URL}). Restore your Supabase project in the dashboard, restart the backend, then run npm run start:tunnel.`
      : state === 'api'
        ? `Cannot reach backend at ${API_URL}. Keep the backend running and use npm run start:tunnel if your phone is not on the same Wi-Fi.`
        : `Supabase is offline (project paused or restoring). Open supabase.com/dashboard/project/vplhvgavwaezzershbft, click Restore, wait until Active, then reload this app.`;

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Connection problem</Text>
      <Text style={styles.body}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF2F2',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginHorizontal: spacing.screen,
    marginTop: spacing.inner,
    padding: 14,
    gap: 6,
  },
  title: {
    ...type.label,
    color: '#991B1B',
  },
  body: {
    ...type.bodySmall,
    color: '#7F1D1D',
  },
});
