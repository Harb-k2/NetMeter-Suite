import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { MetricCard } from "@/components/netmeter/card";
import { bytes, mbps } from "@/lib/netmeter/format";
import { snapshot } from "@/lib/netmeter/network";
import { notifyUsageLimit } from "@/lib/netmeter/notifications";
import { capture, claimUsageAlert, dashboard } from "@/lib/netmeter/storage";
import type { Dashboard } from "@/lib/netmeter/types";
import { useColors } from "@/hooks/use-colors";

export default function HomeScreen() {
  const colors = useColors(); const [data, setData] = useState<Dashboard | null>(null); const [busy, setBusy] = useState(true);
  const refresh = useCallback(async () => { setBusy(true); try { const value = await snapshot(); const store = await capture(value); const alert = await claimUsageAlert(store, value.network.id); if (alert) await notifyUsageLimit(alert.level, value.network.label, alert.totalBytes, alert.limitBytes); setData(dashboard(store, value)); } finally { setBusy(false); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const total = (data?.usage?.receivedBytes ?? 0) + (data?.usage?.transmittedBytes ?? 0), limit = data?.settings.dailyLimitBytes, percent = limit ? Math.min(100, total / limit * 100) : 0;
  return <ScreenContainer className="px-5"><ScrollView contentContainerStyle={{ paddingVertical: 16, gap: 14 }}>
    <View style={{ gap: 4 }}><Text style={{ color: colors.foreground, textAlign: "right", fontSize: 30, fontWeight: "800" }}>NetMeter</Text><Text style={{ color: colors.muted, textAlign: "right" }}>مراقبة سرعة الإنترنت والاستهلاك</Text></View>
    <MetricCard title="الشبكة المتصلة الآن" value={data?.snapshot?.network.label ?? "جارِ التحقق…"} hint={data?.snapshot?.nativeCapabilities ? (data.snapshot.usageAccessGranted ? "قراءة النظام مفعّلة" : "فعّل إحصاءات الاستخدام للدقة") : "يتطلب الاسم الدقيق بناء Android مخصصًا"} />
    <MetricCard title="استهلاك اليوم لهذه الشبكة" value={bytes(total)} hint={limit ? `الحد اليومي: ${bytes(limit)} · تنزيل ${bytes(data?.usage?.receivedBytes ?? 0)} · رفع ${bytes(data?.usage?.transmittedBytes ?? 0)}` : `تنزيل ${bytes(data?.usage?.receivedBytes ?? 0)} · رفع ${bytes(data?.usage?.transmittedBytes ?? 0)}`}>{limit ? <View style={{ height: 7, borderRadius: 20, backgroundColor: colors.border, overflow: "hidden", marginTop: 8 }}><View style={{ height: 7, width: `${percent}%`, backgroundColor: percent >= 100 ? colors.error : percent >= 80 ? colors.warning : colors.success }} /></View> : null}</MetricCard>
    <View style={{ flexDirection: "row-reverse", gap: 12 }}><View style={{ flex: 1 }}><MetricCard title="آخر تنزيل" value={mbps(data?.lastSpeed?.downloadMbps)} /></View><View style={{ flex: 1 }}><MetricCard title="آخر رفع" value={mbps(data?.lastSpeed?.uploadMbps)} /></View></View>
    <Pressable onPress={() => router.push("/(tabs)/speed" as never)} style={({ pressed }) => ({ backgroundColor: colors.tint, padding: 17, borderRadius: 16, opacity: pressed ? 0.82 : 1 })}><Text style={{ color: "#fff", textAlign: "center", fontWeight: "800", fontSize: 16 }}>بدء قياس السرعة</Text></Pressable>
    <Pressable onPress={() => void refresh()} style={({ pressed }) => ({ padding: 11, opacity: pressed ? 0.6 : 1 })}>{busy ? <ActivityIndicator color={colors.tint} /> : <Text style={{ color: colors.tint, textAlign: "center", fontWeight: "700" }}>تحديث قراءة الشبكة</Text>}</Pressable>
  </ScrollView></ScreenContainer>;
}
