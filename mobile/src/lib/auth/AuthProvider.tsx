import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { setAccessToken } from '../../services/api';
import { signInWithGoogleOAuth } from './googleSignIn';
import { registerAuthRecovery, supabase } from '../supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authUnavailable: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearLocalSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUnavailable, setAuthUnavailable] = useState(false);

  const clearLocalSession = useCallback(async () => {
    setAuthUnavailable(true);
    setSession(null);
    setAccessToken(null);
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  useEffect(() => {
    registerAuthRecovery(clearLocalSession);

    // Deep link return from Google OAuth (backup to openAuthSessionAsync)
    const handleUrl = (url: string) => {
      if (
        !url.includes('auth/callback') &&
        !url.includes('access_token=') &&
        !/[?&#]code=/.test(url)
      ) {
        return;
      }
      void import('./googleSignIn').then(({ createSessionFromUrl }) =>
        createSessionFromUrl(url).catch(() => undefined),
      );
    };
    void Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const linkSub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setAccessToken(data.session?.access_token ?? null);
      })
      .catch(() => clearLocalSession())
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAccessToken(nextSession?.access_token ?? null);
      if (nextSession) setAuthUnavailable(false);
    });

    return () => {
      listener.subscription.unsubscribe();
      linkSub.remove();
    };
  }, [clearLocalSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setAuthUnavailable(false);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const trimmed = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: trimmed,
      password,
    });
    if (error) {
      // Already registered → try signing in
      if (/already|registered|exists/i.test(error.message)) {
        const retry = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (retry.error) throw retry.error;
        setAuthUnavailable(false);
        return;
      }
      throw error;
    }
    if (data.session) {
      setAuthUnavailable(false);
      return;
    }
    // Confirm-email enabled: try immediate sign-in (works only if confirm is off / auto-confirm)
    const retry = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    if (retry.data.session) {
      setAuthUnavailable(false);
      return;
    }
    throw new Error(
      'Check your email to confirm the account, or in Supabase → Authentication → Providers → Email turn OFF “Confirm email”, then try again.',
    );
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithGoogleOAuth();
    setAuthUnavailable(false);
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    setAccessToken(null);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      authUnavailable,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      clearLocalSession,
    }),
    [
      session,
      loading,
      authUnavailable,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      clearLocalSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
