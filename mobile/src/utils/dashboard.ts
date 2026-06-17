import type { DashboardMetric } from '../services/dashboard';
import type { MetricItem } from '../components/home/MetricCarousel';
import { colors } from '../constants/colors';

const METRIC_STYLE: Record<string, { color: string; trackColor: string; icon: string }> = {
  acne: { color: colors.accent.terracotta, trackColor: colors.accent.terracottaLight, icon: '✦' },
  hydration: { color: colors.accent.blue, trackColor: colors.accent.blueLight, icon: '🌿' },
  tone: { color: colors.accent.sage, trackColor: colors.accent.sageLight, icon: '↗' },
};

export function dashboardMetricsToGrid(metrics: DashboardMetric[]): MetricItem[] {
  return metrics.map((m) => {
    const style = METRIC_STYLE[m.id] ?? METRIC_STYLE.tone;
    return {
      id: m.id,
      value: m.value,
      label: m.label,
      progress: m.progress,
      ...style,
    };
  });
}

export function getCurrentPeriod(): 'AM' | 'PM' {
  return new Date().getHours() < 17 ? 'AM' : 'PM';
}

export function formatRoutinePreview(steps: { product_name: string }[]): string {
  if (steps.length === 0) return 'No steps yet — build your routine';
  const names = steps.map((s) => s.product_name.split(' ')[0]);
  const preview = names.join(' → ');
  return steps.length > 3 ? `${preview} → ...` : preview;
}
