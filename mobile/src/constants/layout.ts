import { spacing } from './spacing';

/** Screen shell values — match HomeScreen */
export const layout = {
  screenPaddingTop: 12,
  tabScrollBottom: 120,
  modalScrollBottom: 40,
  content: {
    paddingHorizontal: spacing.screen,
    gap: spacing.section,
  },
} as const;
