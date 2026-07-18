/** Dev-only sample scores to preview the progress calendar UI */

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** daysAgo → overall_score (0–100); includes red / orange / green examples */
const SAMPLE_SCORES: { daysAgo: number; score: number }[] = [
  { daysAgo: 0, score: 72 },
  { daysAgo: 2, score: 70 },
  { daysAgo: 4, score: 68 },
  { daysAgo: 6, score: 65 },
  { daysAgo: 8, score: 62 },
  { daysAgo: 11, score: 58 },
  { daysAgo: 14, score: 55 },
  { daysAgo: 17, score: 48 },
  { daysAgo: 20, score: 42 },
  { daysAgo: 23, score: 38 },
  { daysAgo: 26, score: 35 },
  { daysAgo: 30, score: 32 },
  { daysAgo: 35, score: 28 },
  { daysAgo: 42, score: 25 },
  { daysAgo: 50, score: 22 },
  { daysAgo: 58, score: 18 },
];

export function withSampleScanScores(scores: Map<string, number>): Map<string, number> {
  if (!__DEV__) return scores;

  const merged = new Map(scores);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const { daysAgo, score } of SAMPLE_SCORES) {
    const key = dateKey(addDays(today, -daysAgo));
    if (!merged.has(key)) {
      merged.set(key, score);
    }
  }

  return merged;
}
