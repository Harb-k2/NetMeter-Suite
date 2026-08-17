export type UsageAlertLevel = "warning" | "exceeded";

export function usageAlertLevel(totalBytes: number, limitBytes: number | null): UsageAlertLevel | null {
  if (!limitBytes || limitBytes <= 0) return null;
  if (totalBytes >= limitBytes) return "exceeded";
  if (totalBytes >= limitBytes * 0.8) return "warning";
  return null;
}

export function isStrongerAlert(next: UsageAlertLevel, previous?: UsageAlertLevel): boolean {
  const rank = { warning: 1, exceeded: 2 } as const;
  return !previous || rank[next] > rank[previous];
}
