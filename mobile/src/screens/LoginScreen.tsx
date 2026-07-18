import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { font, type } from '../constants/typography';
import { useAuth } from '../lib/auth/AuthProvider';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, authUnavailable } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      if (!message.toLowerCase().includes('cancelled')) {
        setError(message);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + spacing.section + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>skins</Text>
      <Text style={styles.tagline}>AI-powered skincare, personalized for you</Text>

      {authUnavailable && (
        <Text style={styles.serviceNotice}>
          Supabase is waking up or paused. Restore the skins project in your Supabase
          dashboard, then try again.
        </Text>
      )}

      <View style={styles.form}>
        <Pressable
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          onPress={() => void handleGoogle()}
          disabled={googleLoading || loading || authUnavailable}
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color={colors.text} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.or}>or</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading || googleLoading}
        >
          {loading ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.link}>
            New here? <Text style={styles.linkBold}>Create account</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screen,
  },
  logo: {
    ...type.screenTitle,
    fontSize: 42,
  },
  tagline: {
    ...type.body,
    marginTop: spacing.inner,
    marginBottom: spacing.section + 16,
  },
  serviceNotice: {
    ...type.bodySmall,
    color: '#991B1B',
    backgroundColor: '#FEF2F2',
    borderRadius: radii.sm,
    padding: spacing.titleBelow,
    marginBottom: 16,
  },
  form: {
    gap: spacing.item,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.item,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  googleButtonText: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  or: {
    ...type.bodySmall,
    textAlign: 'center',
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    ...font.regular,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.fab,
    borderRadius: radii.sm,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.inner,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...type.button,
  },
  link: {
    ...type.body,
    textAlign: 'center',
    marginTop: spacing.inner,
  },
  linkBold: {
    ...type.link,
  },
  error: {
    ...type.bodySmall,
    color: colors.error,
  },
});
