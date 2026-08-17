import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { MetricCard } from "@/components/netmeter/card";
import { MonthCalendar } from "@/components/netmeter/month-calendar";
import { calendarMonth } from "@/lib/netmeter/analytics";
import { bytes } from "@/lib/netmeter/format";
import { snapshot } from "@/lib/netmeter/network";
import { load } from "@/lib/netmeter/storage";
import type { NetworkRecord } from "@/lib/netmeter/types";
import { useColors } from "@/hooks/use-colors";

export default function CalendarScreen() {
  const colors = useColors(); const [offset, setOffset] = useState(0); const [network, setNetwork] = useState<NetworkRecord | null>(null);
  const refresh = useCallback(async () => { const store = await load(); const current = await snapshot(); setNetwork(store.networks[current.network.id] ?? Object.values(store.networks)[0] ?? null); }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const calendar = calendarMonth(network, offset); const comparison = calendar.changePercent === null ? "لا توجد بيانات للشهر السابق" : `${calendar.changePercent >= 0 ? "+" : ""}${calendar.changePercent.toFixed(1)}٪ مقارنةً بالشهر السابق`;
  return <ScreenContainer className="px-5"><ScrollView contentContainerStyle={{ paddingVertical: 18, gap: 15 }}><View><Text style={{ color: colors.foreground, textAlign: "right", fontSize: 28, fontWeight: "800" }}>التقويم الشهري</Text><Text style={{ color: colors.muted, textAlign: "right", marginTop: 4 }}>{network?.label ?? "سيظهر سجل الشبكة بعد أول قراءة."}</Text></View><View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}><Pressable onPress={() => setOffset((value) => value + 1)} style={{ padding: 10 }}><Text style={{ color: colors.tint, fontWeight: "800" }}>الشهر التالي</Text></Pressable><Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 17 }}>{calendar.label}</Text><Pressable onPress={() => setOffset((value) => value - 1)} style={{ padding: 10 }}><Text style={{ color: colors.tint, fontWeight: "800" }}>الشهر السابق</Text></Pressable></View><View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 14 }}><MonthCalendar days={calendar.days} firstWeekday={calendar.firstWeekday} /></View><View style={{ flexDirection: "row-reverse", gap: 12 }}><View style={{ flex: 1 }}><MetricCard title="إجمالي الشهر" value={bytes(calendar.totalBytes)} /></View><View style={{ flex: 1 }}><MetricCard title="الشهر السابق" value={bytes(calendar.previousBytes)} /></View></View><View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 15 }}><Text style={{ color: calendar.changePercent !== null && calendar.changePercent > 0 ? colors.warning : colors.success, textAlign: "right", fontWeight: "800" }}>{comparison}</Text></View></ScrollView></ScreenContainer>;
}
