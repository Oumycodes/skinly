import { StyleSheet } from 'react-native';

import { colors, radii } from './colors';
import { spacing } from './spacing';
import { font, type } from './typography';

/** Shared card chrome — matches home scan summary + metric badges */
export const cardChrome = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.borderCard,
  borderRadius: radii.card,
} as const;

export const sharedCardStyles = StyleSheet.create({
  scoreCard: {
    ...cardChrome,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.item,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  scoreValue: {
    ...type.stat,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.5,
    minWidth: 64,
  },
  scoreSummary: {
    ...type.bodySmall,
    lineHeight: 19.5,
    flex: 1,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.inner + 1,
  },
  badge: {
    width: '48.5%',
    flexGrow: 1,
    flexBasis: '46%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 16,
    paddingHorizontal: 12,
    ...cardChrome,
  },
  badgeActive: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  badgeLabel: {
    ...type.label,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  badgeLabelActive: {
    color: 'rgba(255,255,255,0.75)',
  },
  badgeScore: {
    ...font.semibold,
    fontSize: 24,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'center',
  },
  badgeScoreActive: {
    color: colors.surface,
  },
  surfaceCard: {
    ...cardChrome,
    padding: 18,
    gap: spacing.inner,
  },
});
