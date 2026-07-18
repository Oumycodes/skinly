export const colors = {
  primary: '#6B8E6B',
  primaryLight: '#E8F3E8',
  primaryDark: '#4A6F4A',
  primaryRing: '#6B8E6B',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F5F5',

  text: '#1C1917',
  textSecondary: '#78716C',
  textMuted: '#A8A29E',

  border: '#E7E5E0',
  borderLight: '#F0EEE8',
  borderCard: '#E3E2DE',

  dark: '#1C1917',

  accent: {
    terracotta: '#C4927B',
    terracottaLight: '#F5E8DF',
    peach: '#F5E6D8',
    peachDark: '#E8C4A8',
    blue: '#7A9EAF',
    blueLight: '#E3EEF3',
    sage: '#6B8E6B',
    sageLight: '#E8F3E8',
  },

  streak: '#F59E0B',
  fab: '#1C1917',

  error: '#DC6B6B',
  warning: '#D97706',
  success: '#6B8E6B',

  severity: {
    mild: '#6B8E6B',
    moderate: '#D97706',
    severe: '#DC6B6B',
  },

  tabActive: {
    Home: '#E8F3E8',
    Progress: '#E3EEF3',
    Shelf: '#F5E8DF',
    Profile: '#F3F1EB',
  },
} as const;

export const radii = {
  sm: 14,
  md: 20,
  lg: 24,
  xl: 32,
  card: 18,
  pill: 40,
  full: 999,
} as const;
