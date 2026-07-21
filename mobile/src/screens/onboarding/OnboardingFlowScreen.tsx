import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingOptionCard } from '../../components/onboarding/OnboardingOptionCard';
import { OnboardingPrimaryButton } from '../../components/onboarding/OnboardingPrimaryButton';
import { OnboardingProgressBar } from '../../components/onboarding/OnboardingProgressBar';
import {
  OnboardingRoutineStep,
  parseRoutineAnswer,
} from '../../components/onboarding/OnboardingRoutineStep';
import { colors, radii } from '../../constants/colors';
import {
  ONBOARDING_STEPS,
  type OnboardingAnswerValue,
  type OnboardingStep,
} from '../../constants/onboarding';
import { spacing } from '../../constants/spacing';
import { font, type } from '../../constants/typography';
import { useOnboardingFlow } from '../../context/OnboardingProvider';
import { useAuth } from '../../lib/auth/AuthProvider';

export function OnboardingFlowScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    stepIndex,
    totalSteps,
    canGoBack,
    goNext,
    goBack,
    answers,
    setAnswer,
    completeOnboarding,
  } = useOnboardingFlow();

  const step = ONBOARDING_STEPS[stepIndex];
  const progress = (stepIndex + 1) / totalSteps;
  const showHeader = step.type !== 'welcome';

  const canContinue = useMemo(
    () => isStepValid(step, answers, Boolean(user)),
    [step, answers, user],
  );

  async function handleContinue() {
    if (step.type === 'plan-ready') {
      await completeOnboarding();
      return;
    }
    goNext();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      {showHeader ? (
        <OnboardingProgressBar
          progress={progress}
          showBack={canGoBack}
          onBack={goBack}
        />
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StepContent step={step} answers={answers} setAnswer={setAnswer} onContinue={handleContinue} />
      </ScrollView>

      {step.type !== 'generating' ? (
        <View style={styles.footer}>
          <OnboardingPrimaryButton
            label={getCtaLabel(step)}
            onPress={handleContinue}
            disabled={!canContinue}
          />
          {step.type === 'camera-intro' ? (
            <Pressable onPress={goNext} hitSlop={8}>
              <Text style={styles.skipLink}>Not now</Text>
            </Pressable>
          ) : null}
          {step.type === 'current-routine' ? (
            <Pressable
              onPress={() => {
                setAnswer('currentRoutine', []);
                setAnswer('routineSkipped', true);
                goNext();
              }}
              hitSlop={8}
            >
              <Text style={styles.skipLink}>I don't use products yet</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function getCtaLabel(step: OnboardingStep): string {
  if (step.type === 'welcome') return step.cta;
  if (step.type === 'plan-ready') return step.cta;
  if (step.type === 'google-auth') return 'Continue';
  if (step.type === 'camera-intro') return 'Continue';
  return 'Continue';
}

function isStepValid(
  step: OnboardingStep,
  answers: Record<string, OnboardingAnswerValue>,
  signedIn: boolean,
): boolean {
  switch (step.type) {
    case 'welcome':
    case 'camera-intro':
    case 'generating':
    case 'plan-ready':
      return true;
    case 'google-auth':
      return signedIn;
    case 'current-routine': {
      const routine = parseRoutineAnswer(answers[step.answerKey]);
      return routine.length > 0 || answers.routineSkipped === true;
    }
    case 'single-select':
      return typeof answers[step.answerKey] === 'string' && answers[step.answerKey] !== '';
    case 'multi-select': {
      const value = answers[step.answerKey];
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'string'
      );
    }
    case 'yes-no':
      return typeof answers[step.answerKey] === 'boolean';
    default:
      return true;
  }
}

interface StepContentProps {
  step: OnboardingStep;
  answers: Record<string, OnboardingAnswerValue>;
  setAnswer: (key: string, value: OnboardingAnswerValue) => void;
  onContinue: () => void;
}

function StepContent({ step, answers, setAnswer, onContinue }: StepContentProps) {
  switch (step.type) {
    case 'welcome':
      return <WelcomeStep step={step} />;
    case 'google-auth':
      return <GoogleAuthStep step={step} />;
    case 'current-routine':
      return (
        <OnboardingRoutineStep
          title={step.title}
          subtitle={step.subtitle}
          value={parseRoutineAnswer(answers[step.answerKey])}
          onChange={(products) => {
            setAnswer(step.answerKey, products);
            if (products.length > 0) {
              setAnswer('routineSkipped', false);
            }
          }}
        />
      );
    case 'single-select':
      return (
        <SingleSelectStep
          step={step}
          value={answers[step.answerKey] as string | undefined}
          onChange={(value) => setAnswer(step.answerKey, value)}
        />
      );
    case 'multi-select':
      return (
        <MultiSelectStep
          step={step}
          value={(answers[step.answerKey] as string[] | undefined) ?? []}
          onChange={(value) => setAnswer(step.answerKey, value)}
        />
      );
    case 'yes-no':
      return (
        <YesNoStep
          step={step}
          value={answers[step.answerKey] as boolean | undefined}
          onChange={(value) => setAnswer(step.answerKey, value)}
        />
      );
    case 'camera-intro':
      return <CameraIntroStep step={step} />;
    case 'generating':
      return <GeneratingStep step={step} onDone={onContinue} />;
    case 'plan-ready':
      return <PlanReadyStep step={step} answers={answers} />;
    default:
      return null;
  }
}

function WelcomeStep({ step }: { step: Extract<OnboardingStep, { type: 'welcome' }> }) {
  return (
    <View style={styles.welcome}>
      <Text style={styles.brand}>skins</Text>
      <View style={styles.heroCard}>
        <View style={styles.heroCircle}>
          <Ionicons name="scan-outline" size={42} color={colors.primary} />
        </View>
        <Text style={styles.welcomeTitle}>{step.title}</Text>
        <Text style={styles.welcomeSubtitle}>{step.subtitle}</Text>
      </View>
    </View>
  );
}

function GoogleAuthStep({ step }: { step: Extract<OnboardingStep, { type: 'google-auth' }> }) {
  const { user, signInWithGoogle, signIn, signUp, authUnavailable } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [emailLoading, setEmailLoading] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      if (!message.toLowerCase().includes('cancelled')) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail() {
    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }
    setEmailLoading(true);
    setError(null);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === 'signup'
            ? 'Sign-up failed'
            : 'Sign-in failed',
      );
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <View style={[styles.step, styles.centered]}>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.subtitle}>{step.subtitle}</Text>

      {user ? (
        <View style={styles.signedInCard}>
          <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
          <Text style={styles.signedInTitle}>Signed in</Text>
          <Text style={styles.signedInEmail}>{user.email}</Text>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.authInput}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.authInput}
            placeholder="Password (min 6 characters)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={[styles.emailButton, (emailLoading || authUnavailable) && styles.googleButtonDisabled]}
            onPress={() => void handleEmail()}
            disabled={emailLoading || loading || authUnavailable}
          >
            <Text style={styles.emailButtonText}>
              {emailLoading
                ? 'One moment…'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Sign in'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode((m) => (m === 'signup' ? 'signin' : 'signup'))}
          >
            <Text style={styles.authSwitch}>
              {mode === 'signup'
                ? 'Already have an account? Sign in'
                : 'New here? Create account'}
            </Text>
          </Pressable>

          <Text style={styles.authDivider}>or</Text>

          <Pressable
            style={[styles.googleButton, loading && styles.googleButtonDisabled]}
            onPress={() => void handleGoogle()}
            disabled={loading || authUnavailable}
          >
            {loading ? (
              <Text style={styles.googleButtonText}>Connecting…</Text>
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={colors.text} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </Pressable>
        </>
      )}

      {authUnavailable ? (
        <Text style={styles.authError}>
          Auth service is unavailable. Restore your Supabase project, then try again.
        </Text>
      ) : null}
      {error ? <Text style={styles.authError}>{error}</Text> : null}
    </View>
  );
}

function SingleSelectStep({
  step,
  value,
  onChange,
}: {
  step: Extract<OnboardingStep, { type: 'single-select' }>;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle ? <Text style={styles.subtitle}>{step.subtitle}</Text> : null}
      <View style={styles.options}>
        {step.options.map((option) => (
          <OnboardingOptionCard
            key={option.id}
            option={option}
            selected={value === option.id}
            onPress={() => onChange(option.id)}
          />
        ))}
      </View>
    </View>
  );
}

function MultiSelectStep({
  step,
  value,
  onChange,
}: {
  step: Extract<OnboardingStep, { type: 'multi-select' }>;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    onChange([...value, id]);
  }

  return (
    <View style={styles.step}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle ? <Text style={styles.subtitle}>{step.subtitle}</Text> : null}
      <View style={styles.options}>
        {step.options.map((option) => (
          <OnboardingOptionCard
            key={option.id}
            option={option}
            selected={value.includes(option.id)}
            onPress={() => toggle(option.id)}
          />
        ))}
      </View>
    </View>
  );
}

function YesNoStep({
  step,
  value,
  onChange,
}: {
  step: Extract<OnboardingStep, { type: 'yes-no' }>;
  value?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.title}>{step.title}</Text>
      {step.subtitle ? <Text style={styles.subtitle}>{step.subtitle}</Text> : null}
      <View style={styles.yesNoRow}>
        <Pressable
          style={[styles.yesNoButton, value === false && styles.yesNoSelected]}
          onPress={() => onChange(false)}
        >
          <Text style={[styles.yesNoText, value === false && styles.yesNoTextSelected]}>No</Text>
        </Pressable>
        <Pressable
          style={[styles.yesNoButton, value === true && styles.yesNoSelected]}
          onPress={() => onChange(true)}
        >
          <Text style={[styles.yesNoText, value === true && styles.yesNoTextSelected]}>Yes</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CameraIntroStep({ step }: { step: Extract<OnboardingStep, { type: 'camera-intro' }> }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [requesting, setRequesting] = useState(false);

  async function handleAllow() {
    setRequesting(true);
    try {
      await requestPermission();
    } finally {
      setRequesting(false);
    }
  }

  const granted = permission?.granted === true;
  const denied = permission && !permission.granted && !permission.canAskAgain;

  return (
    <View style={[styles.step, styles.centered]}>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.subtitle}>{step.subtitle}</Text>
      <View style={styles.cameraSingle}>
        <Ionicons name="camera-outline" size={48} color={colors.text} />
      </View>
      {granted ? (
        <Text style={styles.cameraStatus}>Camera access allowed</Text>
      ) : (
        <Pressable
          style={[styles.allowButton, requesting && styles.allowButtonDisabled]}
          onPress={() => void handleAllow()}
          disabled={requesting}
        >
          <Text style={styles.allowButtonText}>
            {denied ? 'Open Settings to allow camera' : requesting ? 'Requesting…' : 'Allow camera'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function GeneratingStep({
  step,
  onDone,
}: {
  step: Extract<OnboardingStep, { type: 'generating' }>;
  onDone: () => void;
}) {
  const [percent, setPercent] = useState(12);

  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(onDone, 400);
          return 100;
        }
        return p + 4;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <View style={[styles.step, styles.centered]}>
      <Text style={styles.generatingPercent}>{percent}%</Text>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.subtitle}>{step.subtitle}</Text>
      <View style={styles.generatingTrack}>
        <View style={[styles.generatingFill, { width: `${percent}%` }]} />
      </View>
      <View style={styles.generatingList}>
        {step.items.map((item) => (
          <Text key={item} style={styles.generatingItem}>
            • {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

function PlanReadyStep({
  step,
  answers,
}: {
  step: Extract<OnboardingStep, { type: 'plan-ready' }>;
  answers: Record<string, OnboardingAnswerValue>;
}) {
  const goals = answers.skinGoals;
  const goalLabel = formatGoals(Array.isArray(goals) ? goals.filter((g): g is string => typeof g === 'string') : []);
  const routineCount = parseRoutineAnswer(answers.currentRoutine).length;

  return (
    <View style={styles.step}>
      <View style={styles.doneBadge}>
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        <Text style={styles.doneBadgeText}>All done!</Text>
      </View>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.subtitle}>{step.subtitle}</Text>
      <View style={styles.planCard}>
        <Text style={styles.planGoalLabel}>Your focus</Text>
        <Text style={styles.planGoal}>{goalLabel}</Text>
        {routineCount > 0 ? (
          <Text style={styles.planRoutineNote}>
            {routineCount} product{routineCount === 1 ? '' : 's'} added to your routine
          </Text>
        ) : null}
        <View style={styles.planGrid}>
          <PlanMetric label="Hydration" value="Track" />
          <PlanMetric label="Texture" value="Track" />
          <PlanMetric label="Routine" value="Daily" />
          <PlanMetric label="Skin score" value="Baseline" />
        </View>
      </View>
    </View>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.planMetric}>
      <Text style={styles.planMetricLabel}>{label}</Text>
      <Text style={styles.planMetricValue}>{value}</Text>
    </View>
  );
}

function formatGoals(goals: string[]): string {
  if (goals.length === 0) return 'Healthier skin';
  const labels = goals.map((goal) => {
    switch (goal) {
      case 'clear-acne':
        return 'Clear breakouts';
      case 'hydration':
        return 'Boost hydration';
      case 'even-tone':
        return 'Even skin tone';
      case 'anti-aging':
        return 'Reduce fine lines';
      case 'maintain':
        return 'Maintain healthy skin';
      default:
        return goal;
    }
  });
  return labels.join(' · ');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.section,
    paddingBottom: spacing.section,
  },
  footer: {
    paddingHorizontal: spacing.screen,
    gap: spacing.item,
  },
  skipLink: {
    ...type.bodySmall,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  step: {
    gap: spacing.section,
  },
  centered: {
    alignItems: 'center',
  },
  welcome: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.section,
    minHeight: 520,
  },
  brand: {
    ...font.bold,
    fontSize: 34,
    color: colors.text,
    textAlign: 'center',
  },
  heroCard: {
    alignItems: 'center',
    gap: spacing.section,
  },
  heroCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    ...type.screenTitle,
    textAlign: 'center',
    fontSize: 30,
  },
  welcomeSubtitle: {
    ...type.body,
    textAlign: 'center',
    paddingHorizontal: spacing.inner,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.item,
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 16,
    backgroundColor: colors.background,
    marginTop: spacing.section,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  signedInCard: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.screen,
    marginTop: spacing.section,
  },
  signedInTitle: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  signedInEmail: {
    ...type.bodySmall,
  },
  authError: {
    ...type.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  redirectHint: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.inner,
  },
  authDivider: {
    ...type.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.item,
  },
  authInput: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    ...font.regular,
    color: colors.text,
    marginTop: spacing.item,
  },
  emailButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.item,
  },
  emailButtonText: {
    ...type.button,
    color: '#FFFFFF',
  },
  authSwitch: {
    ...type.link,
    textAlign: 'center',
    marginTop: spacing.item,
  },
  title: {
    ...type.screenTitle,
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    ...type.body,
    marginTop: -8,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
  highlight: {
    ...font.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  options: {
    gap: spacing.item,
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: spacing.item,
    marginTop: spacing.inner,
  },
  yesNoButton: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  yesNoSelected: {
    backgroundColor: colors.fab,
    borderColor: colors.fab,
  },
  yesNoText: {
    ...font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  yesNoTextSelected: {
    color: '#FFFFFF',
  },
  cameraSingle: {
    width: 120,
    height: 120,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.section,
  },
  cameraStatus: {
    ...font.semibold,
    fontSize: 15,
    color: colors.primary,
  },
  allowButton: {
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: colors.surfaceMuted,
  },
  allowButtonDisabled: {
    opacity: 0.6,
  },
  allowButtonText: {
    ...font.semibold,
    fontSize: 15,
    color: colors.text,
  },
  generatingPercent: {
    ...type.stat,
    fontSize: 48,
  },
  generatingTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  generatingFill: {
    height: '100%',
    backgroundColor: colors.dark,
  },
  generatingList: {
    width: '100%',
    gap: 6,
  },
  generatingItem: {
    ...type.bodySmall,
    color: colors.textSecondary,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doneBadgeText: {
    ...font.semibold,
    fontSize: 15,
    color: colors.primary,
  },
  planCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.screen,
    gap: spacing.item,
  },
  planGoalLabel: {
    ...type.caption,
    textTransform: 'uppercase',
  },
  planGoal: {
    ...font.bold,
    fontSize: 22,
    color: colors.text,
  },
  planRoutineNote: {
    ...type.bodySmall,
    color: colors.textSecondary,
  },
  planGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.item,
    marginTop: spacing.inner,
  },
  planMetric: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.item,
    gap: 4,
  },
  planMetricLabel: {
    ...type.caption,
  },
  planMetricValue: {
    ...font.semibold,
    fontSize: 15,
    color: colors.text,
  },
});
