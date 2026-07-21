import type { OnboardingRoutineProduct } from '../types/onboardingRoutine';

export type OnboardingAnswerValue = string | string[] | boolean | OnboardingRoutineProduct[];

export interface OnboardingOption {
  id: string;
  label: string;
  description?: string;
  /** Ionicons glyph name (Cal AI-style app / list icons) */
  ionicon?: string;
}

export type OnboardingStep =
  | {
      id: string;
      type: 'welcome';
      title: string;
      subtitle: string;
      cta: string;
    }
  | {
      id: string;
      type: 'google-auth';
      title: string;
      subtitle: string;
    }
  | {
      id: string;
      type: 'current-routine';
      title: string;
      subtitle: string;
      answerKey: string;
    }
  | {
      id: string;
      type: 'single-select';
      title: string;
      subtitle?: string;
      answerKey: string;
      options: OnboardingOption[];
    }
  | {
      id: string;
      type: 'multi-select';
      title: string;
      subtitle?: string;
      answerKey: string;
      options: OnboardingOption[];
    }
  | {
      id: string;
      type: 'yes-no';
      title: string;
      subtitle?: string;
      answerKey: string;
    }
  | {
      id: string;
      type: 'camera-intro';
      title: string;
      subtitle: string;
    }
  | {
      id: string;
      type: 'generating';
      title: string;
      subtitle: string;
      items: string[];
    }
  | {
      id: string;
      type: 'plan-ready';
      title: string;
      subtitle: string;
      cta: string;
    };

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    type: 'welcome',
    title: 'Skincare tracking made easy',
    subtitle: 'Scan your skin, build your routine, and track real progress over time.',
    cta: 'Get Started',
  },
  {
    id: 'google-auth',
    type: 'google-auth',
    title: 'Save your progress',
    subtitle:
      'Create an account with email so your shelf, scans, and routine sync. (Google isn’t available in Expo Go on iPhone — use email.)',
  },
  {
    id: 'skin-type',
    type: 'single-select',
    title: 'What is your skin type?',
    subtitle: 'This helps us personalize your routine and product picks.',
    answerKey: 'skinType',
    options: [
      { id: 'oily', label: 'Oily' },
      { id: 'dry', label: 'Dry' },
      { id: 'combination', label: 'Combination' },
      { id: 'sensitive', label: 'Sensitive' },
      { id: 'normal', label: 'Normal' },
    ],
  },
  {
    id: 'current-routine',
    type: 'current-routine',
    title: 'What is your current routine?',
    subtitle: 'Add the products you actually use — morning, night, and how often each week.',
    answerKey: 'currentRoutine',
  },
  {
    id: 'hear-about',
    type: 'single-select',
    title: 'Where did you hear about us?',
    answerKey: 'hearAbout',
    options: [
      { id: 'instagram', label: 'Instagram', ionicon: 'logo-instagram' },
      { id: 'tiktok', label: 'TikTok', ionicon: 'logo-tiktok' },
      { id: 'friend', label: 'Friend or family', ionicon: 'people-outline' },
      { id: 'youtube', label: 'YouTube', ionicon: 'logo-youtube' },
      { id: 'other', label: 'Other', ionicon: 'chatbubble-ellipses-outline' },
    ],
  },
  {
    id: 'tried-apps',
    type: 'yes-no',
    title: 'Have you tried other skincare tracking apps?',
    answerKey: 'triedOtherApps',
  },
  {
    id: 'age',
    type: 'single-select',
    title: 'How old are you?',
    subtitle: 'Age helps us tailor ingredient and routine recommendations.',
    answerKey: 'ageRange',
    options: [
      { id: 'under-18', label: 'Under 18' },
      { id: '18-24', label: '18–24' },
      { id: '25-34', label: '25–34' },
      { id: '35-44', label: '35–44' },
      { id: '45-plus', label: '45+' },
    ],
  },
  {
    id: 'skin-goals',
    type: 'multi-select',
    title: 'What are your skin goals?',
    subtitle: 'Select all that apply — we will build your plan around these.',
    answerKey: 'skinGoals',
    options: [
      { id: 'clear-acne', label: 'Clear breakouts', ionicon: 'water-outline' },
      { id: 'hydration', label: 'Boost hydration', ionicon: 'rainy-outline' },
      { id: 'even-tone', label: 'Even skin tone', ionicon: 'sunny-outline' },
      { id: 'anti-aging', label: 'Reduce fine lines', ionicon: 'hourglass-outline' },
      { id: 'maintain', label: 'Maintain healthy skin', ionicon: 'leaf-outline' },
    ],
  },
  {
    id: 'concerns',
    type: 'multi-select',
    title: "What's stopping you from reaching your skin goals?",
    subtitle: 'Select all that apply.',
    answerKey: 'concerns',
    options: [
      { id: 'consistency', label: 'Lack of consistency', ionicon: 'calendar-outline' },
      { id: 'products', label: "Don't know which products to use", ionicon: 'flask-outline' },
      { id: 'routine', label: 'No structured routine', ionicon: 'list-outline' },
      { id: 'busy', label: 'Busy schedule', ionicon: 'time-outline' },
      { id: 'stress', label: 'Stress-related flare-ups', ionicon: 'heart-dislike-outline' },
    ],
  },
  {
    id: 'camera',
    type: 'camera-intro',
    title: 'Allow camera access',
    subtitle: 'skins needs your camera to scan your skin and track progress over time.',
  },
  {
    id: 'track-products',
    type: 'yes-no',
    title: 'Would you like to track products on your shelf?',
    subtitle: 'We can check ingredients and flag conflicts with your routine.',
    answerKey: 'trackProducts',
  },
  {
    id: 'generating',
    type: 'generating',
    title: "We're setting everything up for you",
    subtitle: 'Customizing your skincare plan…',
    items: ['Skin profile', 'Routine steps', 'Product focus', 'Scan schedule', 'Skin score baseline'],
  },
  {
    id: 'plan-ready',
    type: 'plan-ready',
    title: 'Congratulations — your custom plan is ready!',
    subtitle: 'Your personalized routine is built around your skin type, goals, and concerns.',
    cta: "Let's get started!",
  },
];

export const ONBOARDING_STORAGE_KEY = '@skins/onboarding_complete_v3';
export const ONBOARDING_ANSWERS_KEY = '@skins/onboarding_answers_v3';
export const ONBOARDING_ROUTINE_SYNCED_KEY = '@skins/onboarding_routine_synced_v3';
