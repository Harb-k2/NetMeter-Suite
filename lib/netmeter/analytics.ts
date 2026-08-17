import { todayKey } from "./format";
import type { DailyUsage, NetworkRecord, Store } from "./types";

export type UsagePoint = { date: string; receivedBytes: number; transmittedBytes: number; totalBytes: number };

const total = (day: DailyUsage | undefined) => (day?.receivedBytes ?? 0) + (day?.transmittedBytes ?? 0);
export function dayTotal(network: NetworkRecord | null | undefined, date = todayKey()) { return total(network?.daily[date]); }
export function series(network: NetworkRecord | null | undefined, days = 7, end = new Date()): UsagePoint[] {
  const points: UsagePoint[] = [];
  for (let index = days - 1; index >= 0; index -= 1) { const date = new Date(end); date.setDate(end.getDate() - index); const key = todayKey(date); const value = network?.daily[key]; points.push({ date: key, receivedBytes: value?.receivedBytes ?? 0, transmittedBytes: value?.transmittedBytes ?? 0, totalBytes: total(value) }); }
  return points;
}
export function monthTotal(network: NetworkRecord | null | undefined, month = todayKey().slice(0, 7)) { return Object.entries(network?.daily ?? {}).filter(([date]) => date.startsWith(month)).reduce((sum, [, day]) => sum + total(day), 0); }
export function networkTotal(network: NetworkRecord) { return Object.values(network.daily).reduce((sum, day) => sum + total(day), 0); }
export function topNetwork(store: Store) { return Object.values(store.networks).sort((left, right) => networkTotal(right) - networkTotal(left))[0] ?? null; }
export function csvExport(store: Store): string {
  const rows = [["الشبكة", "المعرف", "التاريخ", "التنزيل بالبايت", "الرفع بالبايت", "الإجمالي بالبايت"]];
  Object.values(store.networks).sort((a, b) => a.label.localeCompare(b.label)).forEach((network) => Object.values(network.daily).sort((a, b) => a.date.localeCompare(b.date)).forEach((day) => rows.push([network.label, network.id, day.date, String(day.receivedBytes), String(day.transmittedBytes), String(total(day))])));
  return `\uFEFF${rows.map((row) => row.map((item) => `"${String(item).replaceAll('"', '""')}"`).join(",")).join("\n")}`;
}
