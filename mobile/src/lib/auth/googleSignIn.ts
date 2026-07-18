import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

export function getAuthRedirectUri(): string {
  return Linking.createURL('auth/callback');
}

export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) {
    throw new Error(errorCode);
  }

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;

  if (!access_token || !refresh_token) {
    throw new Error('No session returned from Google sign-in');
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
}

export async function signInWithGoogleOAuth(): Promise<void> {
  const redirectTo = getAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No Google auth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    throw new Error('Google sign-in was cancelled');
  }

  await createSessionFromUrl(result.url);
}
