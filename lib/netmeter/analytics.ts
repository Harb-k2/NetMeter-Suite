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
export type CalendarDay = { date: string; day: number; totalBytes: number; receivedBytes: number; transmittedBytes: number };
export function calendarMonth(network: NetworkRecord | null | undefined, offset = 0, base = new Date()): { label: string; monthKey: string; firstWeekday: number; days: CalendarDay[]; totalBytes: number; previousBytes: number; changePercent: number | null } {
  const date = new Date(base.getFullYear(), base.getMonth() + offset, 1); const year = date.getFullYear(), month = date.getMonth(); const daysCount = new Date(year, month + 1, 0).getDate(); const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`; const previousKey = `${new Date(year, month - 1, 1).getFullYear()}-${String(new Date(year, month - 1, 1).getMonth() + 1).padStart(2, "0")}`;
  const days = Array.from({ length: daysCount }, (_, index) => { const key = `${monthKey}-${String(index + 1).padStart(2, "0")}`, item = network?.daily[key]; return { date: key, day: index + 1, receivedBytes: item?.receivedBytes ?? 0, transmittedBytes: item?.transmittedBytes ?? 0, totalBytes: total(item) }; });
  const totalBytes = days.reduce((sum, day) => sum + day.totalBytes, 0), previousBytes = monthTotal(network, previousKey);
  return { label: date.toLocaleDateString("ar", { month: "long", year: "numeric" }), monthKey, firstWeekday: date.getDay(), days, totalBytes, previousBytes, changePercent: previousBytes ? ((totalBytes - previousBytes) / previousBytes) * 100 : null };
}
export function networkTotal(network: NetworkRecord) { return Object.values(network.daily).reduce((sum, day) => sum + total(day), 0); }
export function topNetwork(store: Store) { return Object.values(store.networks).sort((left, right) => networkTotal(right) - networkTotal(left))[0] ?? null; }
export function csvExport(store: Store): string {
  const rows = [["الشبكة", "المعرف", "التاريخ", "التنزيل بالبايت", "الرفع بالبايت", "الإجمالي بالبايت"]];
  Object.values(store.networks).sort((a, b) => a.label.localeCompare(b.label)).forEach((network) => Object.values(network.daily).sort((a, b) => a.date.localeCompare(b.date)).forEach((day) => rows.push([network.label, network.id, day.date, String(day.receivedBytes), String(day.transmittedBytes), String(total(day))])));
  return `\uFEFF${rows.map((row) => row.map((item) => `"${String(item).replaceAll('"', '""')}"`).join(",")).join("\n")}`;
}
