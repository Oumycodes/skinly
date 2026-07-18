import { Platform, type TextStyle } from 'react-native';

/** SF Pro on iOS, Roboto on Android */
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
})!;

export const font = {
  regular: { fontFamily, fontWeight: '400' as TextStyle['fontWeight'] },
  medium: { fontFamily, fontWeight: '500' as TextStyle['fontWeight'] },
  semibold: { fontFamily, fontWeight: '600' as TextStyle['fontWeight'] },
  bold: { fontFamily, fontWeight: '700' as TextStyle['fontWeight'] },
};

/** Pre-composed text styles */
export const type = {
  screenTitle: { ...font.bold, fontSize: 28, letterSpacing: -0.5, color: '#1C1917' },
  sectionTitle: { ...font.semibold, fontSize: 20, letterSpacing: -0.3, color: '#1C1917' },
  cardTitle: { ...font.semibold, fontSize: 15, color: '#1C1917' },
  body: { ...font.regular, fontSize: 15, lineHeight: 22, color: '#78716C' },
  bodySmall: { ...font.regular, fontSize: 13, lineHeight: 18, color: '#78716C' },
  label: { ...font.medium, fontSize: 13, color: '#1C1917' },
  caption: { ...font.regular, fontSize: 11, color: '#A8A29E' },
  stat: { ...font.bold, fontSize: 36, lineHeight: 40, letterSpacing: -0.5, color: '#1C1917' },
  metricScore: { ...font.semibold, fontSize: 24, lineHeight: 28, color: '#1C1917' },
  link: { ...font.semibold, fontSize: 15, color: '#6B8E6B' },
  button: { ...font.semibold, fontSize: 16, color: '#FFFFFF' },
  statLabel: {
    ...font.medium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: '#A8A29E',
  },
};

/** @deprecated Use `font` spreads — kept for gradual migration */
export const fonts = {
  sans: fontFamily,
  sansMedium: fontFamily,
  sansSemiBold: fontFamily,
  sansBold: fontFamily,
  serif: fontFamily,
  serifRegular: fontFamily,
};
