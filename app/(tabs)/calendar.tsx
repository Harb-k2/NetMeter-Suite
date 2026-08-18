import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { MetricCard } from "@/components/netmeter/card";
import { ScreenHeader, StatusBanner } from "@/components/netmeter/ui";
import { ScreenTransition } from "@/components/netmeter/screen-transition";
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
  const calendar = useMemo(() => calendarMonth(network, offset), [network, offset]); const comparison = calendar.changePercent === null ? "لا توجد بيانات كافية للمقارنة مع الشهر السابق." : `${calendar.changePercent >= 0 ? "+" : ""}${calendar.changePercent.toFixed(1)}٪ مقارنةً بالشهر السابق`;
  const comparisonTone = calendar.changePercent !== null && calendar.changePercent > 0 ? "warning" : "success";
  return <ScreenTransition><ScreenContainer className="px-5"><ScrollView contentContainerStyle={{ paddingVertical: 18, gap: 15 }} showsVerticalScrollIndicator={false}><ScreenHeader title="التقويم الشهري" subtitle={network ? `تفاصيل استخدام شبكة ${network.label}.` : "سيظهر سجل الشبكة بعد أول قراءة."} badge="عرض يومي" /><View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 5 }}><Pressable accessibilityRole="button" onPress={() => setOffset((value) => value + 1)} style={({ pressed }) => ({ padding: 12, opacity: pressed ? 0.65 : 1 })}><Text style={{ color: colors.tint, fontWeight: "800" }}>التالي</Text></Pressable><Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{calendar.label}</Text><Pressable accessibilityRole="button" onPress={() => setOffset((value) => value - 1)} style={({ pressed }) => ({ padding: 12, opacity: pressed ? 0.65 : 1 })}><Text style={{ color: colors.tint, fontWeight: "800" }}>السابق</Text></Pressable></View><View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 14 }}><MonthCalendar days={calendar.days} firstWeekday={calendar.firstWeekday} /></View><View style={{ flexDirection: "row-reverse", gap: 12 }}><View style={{ flex: 1 }}><MetricCard compact title="إجمالي الشهر" value={bytes(calendar.totalBytes)} /></View><View style={{ flex: 1 }}><MetricCard compact title="الشهر السابق" value={bytes(calendar.previousBytes)} /></View></View><StatusBanner tone={comparisonTone}><Text style={{ color: comparisonTone === "warning" ? colors.warning : colors.success, textAlign: "right", fontWeight: "800", lineHeight: 20 }}>{comparison}</Text></StatusBanner></ScrollView></ScreenContainer></ScreenTransition>;
}
