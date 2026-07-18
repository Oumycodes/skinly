import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  ONBOARDING_ANSWERS_KEY,
  ONBOARDING_ROUTINE_SYNCED_KEY,
  ONBOARDING_STORAGE_KEY,
  type OnboardingAnswerValue,
} from '../constants/onboarding';

export function useOnboarding() {
  const [complete, setComplete] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Record<string, OnboardingAnswerValue>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedComplete, storedAnswers] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_STORAGE_KEY),
          AsyncStorage.getItem(ONBOARDING_ANSWERS_KEY),
        ]);
        if (cancelled) return;
        setComplete(storedComplete === 'true');
        if (storedAnswers) {
          setAnswers(JSON.parse(storedAnswers) as Record<string, OnboardingAnswerValue>);
        }
      } catch {
        if (!cancelled) setComplete(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setAnswer = useCallback((key: string, value: OnboardingAnswerValue) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      void AsyncStorage.setItem(ONBOARDING_ANSWERS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setComplete(true);
  }, []);

  const resetOnboarding = useCallback(async () => {
    await AsyncStorage.multiRemove([
      ONBOARDING_STORAGE_KEY,
      ONBOARDING_ANSWERS_KEY,
      ONBOARDING_ROUTINE_SYNCED_KEY,
    ]);
    setAnswers({});
    setComplete(false);
  }, []);

  return {
    complete,
    answers,
    setAnswer,
    completeOnboarding,
    resetOnboarding,
  };
}
