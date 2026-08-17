export type UsageAlertLevel = "warning" | "exceeded";

export function usageAlertLevel(totalBytes: number, limitBytes: number | null, warningPercentage = 80): UsageAlertLevel | null {
  if (!limitBytes || limitBytes <= 0) return null;
  if (totalBytes >= limitBytes) return "exceeded";
  if (totalBytes >= limitBytes * Math.min(99, Math.max(1, warningPercentage)) / 100) return "warning";
  return null;
}

export function isStrongerAlert(next: UsageAlertLevel, previous?: UsageAlertLevel): boolean {
  const rank = { warning: 1, exceeded: 2 } as const;
  return !previous || rank[next] > rank[previous];
}
