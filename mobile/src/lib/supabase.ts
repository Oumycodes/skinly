import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const AUTH_DOWN_STATUSES = new Set([502, 503, 521, 522, 523]);

let clearLocalSession: (() => Promise<void>) | null = null;

export function registerAuthRecovery(handler: () => Promise<void>) {
  clearLocalSession = handler;
}

const supabaseFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  if (
    url.includes('/auth/v1/') &&
    AUTH_DOWN_STATUSES.has(response.status) &&
    clearLocalSession
  ) {
    await clearLocalSession().catch(() => undefined);
  }

  return response;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    fetch: supabaseFetch,
  },
});
