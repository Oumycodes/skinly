import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Browser OAuth (Supabase → Google → app) is unreliable in Expo Go on iOS.
 * Prefer email/password. Google is best-effort until a native dev build.
 */
export function getAuthRedirectUri(): string {
  let uri = makeRedirectUri({
    scheme: 'skins',
    path: 'auth/callback',
  });

  if (Constants.appOwnership === 'expo' && uri.startsWith('skins://')) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.replace(/\/--\/.*$/, '').replace(/\/$/, '');
      uri = `exp://${host}/--/auth/callback`;
    } else {
      uri = Linking.createURL('auth/callback');
    }
  }

  return uri;
}

export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(String(errorCode));

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
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

function isAuthCallbackUrl(url: string): boolean {
  return (
    url.includes('auth/callback') ||
    url.includes('access_token=') ||
    url.includes('refresh_token=') ||
    /[?&#]code=/.test(url)
  );
}

export async function signInWithGoogleOAuth(): Promise<void> {
  if (isExpoGo()) {
    throw new Error(
      'Google sign-in does not work reliably in Expo Go on iPhone. Use email below (Create account), or build a development build later for Google.',
    );
  }

  const redirectTo = getAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) {
    const msg = error.message || 'Google sign-in failed';
    if (/provider is not enabled/i.test(msg)) {
      throw new Error(
        'Google is not enabled in Supabase. Open Authentication → Providers → Google and turn it on.',
      );
    }
    throw new Error(msg);
  }
  if (!data.url) throw new Error('No Google auth URL returned');

  const linkWait = new Promise<string>((resolve) => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!isAuthCallbackUrl(url)) return;
      sub.remove();
      resolve(url);
    });
  });

  const browserResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  let callbackUrl: string | null = null;
  if (browserResult.type === 'success' && 'url' in browserResult && browserResult.url) {
    callbackUrl = browserResult.url;
  } else if (browserResult.type === 'cancel') {
    throw new Error('Google sign-in was cancelled');
  } else {
    callbackUrl = await Promise.race([
      linkWait,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
  }

  if (!callbackUrl) {
    throw new Error(
      'Google sign-in could not return to the app. Use email instead, or create a development build for Google.',
    );
  }

  await createSessionFromUrl(callbackUrl);
}
