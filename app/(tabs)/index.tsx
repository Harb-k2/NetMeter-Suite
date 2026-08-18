import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { MetricCard } from "@/components/netmeter/card";
import { InsightCard, PrimaryButton, ScreenHeader, SecondaryButton, StatusBanner, UsageProgress } from "@/components/netmeter/ui";
import { ScreenTransition } from "@/components/netmeter/screen-transition";
import { UsageChart } from "@/components/netmeter/usage-chart";
import { bytes, mbps } from "@/lib/netmeter/format";
import { monthTotal, series } from "@/lib/netmeter/analytics";
import { snapshot } from "@/lib/netmeter/network";
import { notifyUsageLimit } from "@/lib/netmeter/notifications";
import { captureWithAlert, dashboard } from "@/lib/netmeter/storage";
import type { Dashboard, Store } from "@/lib/netmeter/types";
import { useColors } from "@/hooks/use-colors";

function usageInsight(percent: number, hasLimit: boolean) {
  if (!hasLimit) return { value: "حد غير مضبوط", detail: "أضف حدًا يوميًا لتنبيهات أكثر دقة.", tone: "neutral" as const };
  if (percent >= 100) return { value: "تجاوز الحد", detail: "راجع استهلاكك أو ارفع الحد لهذه الشبكة.", tone: "error" as const };
  if (percent >= 80) return { value: "اقتربت من الحد", detail: "خفّض الاستخدام لتجنب تجاوز اليوم.", tone: "warning" as const };
  return { value: "ضمن النطاق الآمن", detail: "استهلاكك اليومي ما زال تحت السيطرة.", tone: "success" as const };
}

function connectionInsight(download?: number | null, latency?: number | null) {
  if (!download || latency === null || latency === undefined) return { value: "بانتظار اختبار", detail: "شغّل اختبارًا يدويًا لإظهار تقييم الاتصال.", tone: "neutral" as const };
  if (download >= 50 && latency <= 45) return { value: "اتصال قوي", detail: "آخر نتيجة تشير إلى تنزيل سريع واستجابة جيدة.", tone: "success" as const };
  if (download >= 10 && latency <= 120) return { value: "اتصال مستقر", detail: "مناسب للتصفح والعمل اليومي المعتاد.", tone: "neutral" as const };
  return { value: "اتصال يحتاج مراجعة", detail: "أعد الاختبار بالقرب من نقطة الاتصال أو في وقت مختلف.", tone: "warning" as const };
}

export default function HomeScreen() {
  const colors = useColors();
  const [data, setData] = useState<Dashboard | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const value = await snapshot();
      const { store: next, alert } = await captureWithAlert(value);
      if (alert) await notifyUsageLimit(alert.level, value.network.label, alert.totalBytes, alert.limitBytes);
      setStore(next); setData(dashboard(next, value));
    } catch {
      setError("تعذر تحديث القراءة الآن. تحقق من الاتصال ثم أعد المحاولة.");
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const view = useMemo(() => {
    const total = (data?.usage?.receivedBytes ?? 0) + (data?.usage?.transmittedBytes ?? 0);
    const limit = data?.settings.dailyLimitBytes ?? null;
    return { total, limit, percent: limit ? Math.min(100, total / limit * 100) : 0, weekly: series(data?.network), monthly: monthTotal(data?.network), warning: data?.settings.warningPercentage ?? 80, download: data?.usage?.receivedBytes ?? 0, upload: data?.usage?.transmittedBytes ?? 0 };
  }, [data]);
  const connected = Boolean(data?.snapshot?.internetReachable);
  const usage = usageInsight(view.percent, Boolean(view.limit));
  const connection = connectionInsight(data?.lastSpeed?.downloadMbps, data?.lastSpeed?.latencyMs);

  return <ScreenTransition><ScreenContainer className="px-5"><ScrollView contentContainerStyle={{ paddingVertical: 18, gap: 14 }} showsVerticalScrollIndicator={false}>
    <ScreenHeader title="NetMeter" subtitle="متابعة الاستهلاك والسرعة حسب كل شبكة، محليًا على جهازك." badge={busy ? "جارِ التحديث" : "مراقبة محلية"} />
    <StatusBanner tone={connected ? "success" : error ? "error" : "neutral"}><Text style={{ color: connected ? colors.success : error ? colors.error : colors.tint, textAlign: "right", fontSize: 13, fontWeight: "800" }}>{error ?? (connected ? `المراقبة نشطة على ${data?.snapshot?.network.label ?? "الشبكة الحالية"}.` : "جارِ التحقق من الشبكة الحالية…")}</Text></StatusBanner>
    <MetricCard title="الشبكة المتصلة الآن" value={data?.snapshot?.network.label ?? "جارِ التحقق…"} hint={connected ? "يُفصل الاستهلاك تلقائيًا عن الشبكات الأخرى." : "تحقق من اتصال الجهاز ثم حدّث القراءة."} />
    <MetricCard title="استهلاك اليوم لهذه الشبكة" value={bytes(view.total)} hint={view.limit ? `الحد اليومي ${bytes(view.limit)} · التحذير عند ${view.warning}٪` : "يمكن ضبط حد مستقل لكل شبكة من الإعدادات."}>{view.limit ? <UsageProgress percent={view.percent} detail={`تنزيل ${bytes(view.download)} · رفع ${bytes(view.upload)}`} /> : null}</MetricCard>
    <View style={{ flexDirection: "row-reverse", gap: 12 }}><View style={{ flex: 1 }}><InsightCard title="حالة الاستهلاك" value={usage.value} detail={usage.detail} tone={usage.tone} /></View><View style={{ flex: 1 }}><InsightCard title="جودة الاتصال" value={connection.value} detail={connection.detail} tone={connection.tone} /></View></View>
    <View style={{ flexDirection: "row-reverse", gap: 12 }}><View style={{ flex: 1 }}><MetricCard compact title="استهلاك الشهر" value={bytes(view.monthly)} /></View><View style={{ flex: 1 }}><MetricCard compact title="آخر تنزيل" value={mbps(data?.lastSpeed?.downloadMbps)} /></View></View>
    <UsageChart points={view.weekly} />
    <PrimaryButton label="بدء قياس السرعة" onPress={() => router.push("/(tabs)/speed" as never)} />
    <View style={{ flexDirection: "row-reverse", gap: 12 }}><View style={{ flex: 1 }}><SecondaryButton label="تقارير الشبكات" hint="فتح تقارير الاستهلاك حسب الشبكة" onPress={() => router.push("/(tabs)/networks" as never)} /></View><View style={{ flex: 1 }}><SecondaryButton label={busy ? "جارِ التحديث…" : "تحديث القراءة"} hint="قراءة العداد المحلي للشبكة الحالية" disabled={busy} onPress={() => void refresh()} /></View></View>
  </ScrollView></ScreenContainer></ScreenTransition>;
}
