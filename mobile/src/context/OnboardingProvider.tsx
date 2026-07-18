import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ONBOARDING_STEPS } from '../constants/onboarding';
import { useOnboarding } from '../hooks/useOnboarding';

interface OnboardingContextValue {
  stepIndex: number;
  totalSteps: number;
  canGoBack: boolean;
  goNext: () => void;
  goBack: () => void;
  complete: boolean | null;
  answers: ReturnType<typeof useOnboarding>['answers'];
  setAnswer: ReturnType<typeof useOnboarding>['setAnswer'];
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const onboarding = useOnboarding();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (onboarding.complete === false) {
      setStepIndex(0);
    }
  }, [onboarding.complete]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      stepIndex,
      totalSteps: ONBOARDING_STEPS.length,
      canGoBack: stepIndex > 0,
      goNext: () => setStepIndex((i) => Math.min(i + 1, ONBOARDING_STEPS.length - 1)),
      goBack: () => setStepIndex((i) => Math.max(i - 1, 0)),
      complete: onboarding.complete,
      answers: onboarding.answers,
      setAnswer: onboarding.setAnswer,
      completeOnboarding: onboarding.completeOnboarding,
      resetOnboarding: onboarding.resetOnboarding,
    }),
    [onboarding, stepIndex],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboardingFlow() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboardingFlow must be used within OnboardingProvider');
  return ctx;
}
