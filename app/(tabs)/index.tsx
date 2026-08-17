import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { MetricCard } from "@/components/netmeter/card";
import { UsageChart } from "@/components/netmeter/usage-chart";
import { bytes, mbps } from "@/lib/netmeter/format";
import { monthTotal, series } from "@/lib/netmeter/analytics";
import { snapshot } from "@/lib/netmeter/network";
import { notifyUsageLimit } from "@/lib/netmeter/notifications";
import { capture, claimUsageAlert, dashboard } from "@/lib/netmeter/storage";
import type { Dashboard, Store } from "@/lib/netmeter/types";
import { useColors } from "@/hooks/use-colors";

export default function HomeScreen() {
  const colors = useColors(); const [data, setData] = useState<Dashboard | null>(null); const [store, setStore] = useState<Store | null>(null); const [busy, setBusy] = useState(true);
  const refresh = useCallback(async () => { setBusy(true); try { const value = await snapshot(); const next = await capture(value); const alert = await claimUsageAlert(next, value.network.id); if (alert) await notifyUsageLimit(alert.level, value.network.label, alert.totalBytes, alert.limitBytes); setStore(next); setData(dashboard(next, value)); } finally { setBusy(false); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const total = (data?.usage?.receivedBytes ?? 0) + (data?.usage?.transmittedBytes ?? 0), limit = data?.settings.dailyLimitBytes, percent = limit ? Math.min(100, total / limit * 100) : 0, weekly = series(data?.network), monthly = monthTotal(data?.network), warning = data?.settings.warningPercentage ?? 80;
  return <ScreenContainer className="px-5"><ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 14 }}>
    <View style={{ gap: 4 }}><Text style={{ color: colors.foreground, textAlign: "right", fontSize: 30, fontWeight: "800" }}>NetMeter</Text><Text style={{ color: colors.muted, textAlign: "right" }}>لوحة متابعة الإنترنت الخاصة بك</Text></View>
    <MetricCard title="الشبكة المتصلة الآن" value={data?.snapshot?.network.label ?? "جارِ التحقق…"} hint={data?.snapshot?.internetReachable ? "الإنترنت متاح" : "تحقق من الاتصال أو حدّث القراءة"} />
    <MetricCard title="استهلاك اليوم لهذه الشبكة" value={bytes(total)} hint={limit ? `الحد ${bytes(limit)} · التحذير عند ${warning}٪` : "لم تضبط حدًا بعد"}>{limit ? <View style={{ gap: 7, marginTop: 8 }}><View style={{ height: 8, borderRadius: 20, backgroundColor: colors.border, overflow: "hidden" }}><View style={{ height: 8, width: `${percent}%`, backgroundColor: percent >= 100 ? colors.error : percent >= warning ? colors.warning : colors.success }} /></View><Text style={{ color: percent >= 100 ? colors.error : colors.muted, textAlign: "right", fontSize: 12 }}>{percent.toFixed(0)}٪ من الحد · تنزيل {bytes(data?.usage?.receivedBytes ?? 0)} · رفع {bytes(data?.usage?.transmittedBytes ?? 0)}</Text></View> : null}</MetricCard>
    <View style={{ flexDirection: "row-reverse", gap: 12 }}><View style={{ flex: 1 }}><MetricCard title="هذا الشهر" value={bytes(monthly)} /></View><View style={{ flex: 1 }}><MetricCard title="آخر تنزيل" value={mbps(data?.lastSpeed?.downloadMbps)} /></View></View>
    <UsageChart points={weekly} />
    <Pressable onPress={() => router.push("/(tabs)/speed" as never)} style={({ pressed }) => ({ backgroundColor: colors.tint, padding: 17, borderRadius: 16, opacity: pressed ? 0.82 : 1 })}><Text style={{ color: "#fff", textAlign: "center", fontWeight: "800", fontSize: 16 }}>بدء قياس السرعة</Text></Pressable>
    <View style={{ flexDirection: "row-reverse", gap: 12 }}><Pressable onPress={() => router.push("/(tabs)/networks" as never)} style={{ flex: 1, padding: 14, borderRadius: 15, backgroundColor: colors.surface }}><Text style={{ color: colors.tint, textAlign: "center", fontWeight: "800" }}>تقارير الشبكات</Text></Pressable><Pressable onPress={() => void refresh()} style={{ flex: 1, padding: 14, borderRadius: 15, backgroundColor: colors.surface }}>{busy ? <ActivityIndicator color={colors.tint} /> : <Text style={{ color: colors.tint, textAlign: "center", fontWeight: "800" }}>تحديث القراءة</Text>}</Pressable></View>
  </ScrollView></ScreenContainer>;
}
