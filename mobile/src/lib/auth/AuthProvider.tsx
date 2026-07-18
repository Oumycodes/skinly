import type { Session, User } from '@supabase/supabase-js';
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

    return () => listener.subscription.unsubscribe();
  }, [clearLocalSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setAuthUnavailable(false);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    setAuthUnavailable(false);
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
