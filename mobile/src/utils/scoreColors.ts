/** Calendar colors for a skin score on the 0–10 display scale */

export type ScoreTier = 'red' | 'orange' | 'green';

export interface ScoreDayColors {
  background: string;
  border: string;
  number: string;
  score: string;
  selectedNumber: string;
  selectedScore: string;
}

/** Raw score 0–100 → display value 0–10 */
export function scoreDisplay(score100: number): number {
  return score100 / 10;
}

export function scoreTier(score100: number): ScoreTier {
  const d = scoreDisplay(score100);
  if (d < 4) return 'red';
  if (d < 7) return 'orange';
  return 'green';
}

const TIERS: Record<ScoreTier, ScoreDayColors> = {
  red: {
    background: '#FFE5E5',
    border: '#FF0000',
    number: '#CC0000',
    score: '#FF0000',
    selectedNumber: '#FFFFFF',
    selectedScore: 'rgba(255,255,255,0.92)',
  },
  orange: {
    background: '#FFF3E0',
    border: '#FB8C00',
    number: '#E65100',
    score: '#EF6C00',
    selectedNumber: '#FFFFFF',
    selectedScore: 'rgba(255,255,255,0.92)',
  },
  green: {
    background: '#E8F5E9',
    border: '#43A047',
    number: '#2E7D32',
    score: '#388E3C',
    selectedNumber: '#FFFFFF',
    selectedScore: 'rgba(255,255,255,0.92)',
  },
};

/** 0–4 red · 4–7 orange · 7–10 green (display scale) */
export function scoreDayColors(score100: number): ScoreDayColors {
  return TIERS[scoreTier(score100)];
}

/** Days without a scan score */
export const noScoreDayColors = {
  background: '#FFFFFF',
  border: '#E7E5E0',
  number: '#1C1917',
  selectedBackground: '#1C1917',
  selectedNumber: '#FFFFFF',
} as const;
