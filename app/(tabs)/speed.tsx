import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { MetricCard } from "@/components/netmeter/card";
import { PrimaryButton, ScreenHeader, StatusBanner } from "@/components/netmeter/ui";
import { ScreenTransition } from "@/components/netmeter/screen-transition";
import { mbps } from "@/lib/netmeter/format";
import { snapshot } from "@/lib/netmeter/network";
import { measure } from "@/lib/netmeter/speed";
import { saveSpeed } from "@/lib/netmeter/storage";
import type { SpeedResult } from "@/lib/netmeter/types";
import { useColors } from "@/hooks/use-colors";

export default function SpeedScreen() {
  const colors = useColors(); const [result, setResult] = useState<SpeedResult | null>(null); const [busy, setBusy] = useState(false); const [networkLabel, setNetworkLabel] = useState<string | null>(null);
  const run = async () => { setBusy(true); try { const current = await snapshot(); setNetworkLabel(current.network.label); const value = await measure(current.network.id); await saveSpeed(value); setResult(value); } finally { setBusy(false); } };
  const failed = Boolean(result?.errorMessage);
  return <ScreenTransition><ScreenContainer className="px-5"><ScrollView contentContainerStyle={{ paddingVertical: 18, gap: 14 }} showsVerticalScrollIndicator={false}><ScreenHeader title="قياس السرعة" subtitle="اختبر اتصال الشبكة الحالية عند الطلب فقط. قد يستهلك الاختبار قرابة 2.5 م.ب من البيانات." badge={networkLabel ? `آخر اختبار: ${networkLabel}` : "اختبار يدوي"} /><StatusBanner tone={failed ? "error" : result ? "success" : "neutral"}><Text style={{ color: failed ? colors.error : result ? colors.success : colors.tint, textAlign: "right", fontSize: 13, fontWeight: "800" }}>{failed ? result?.errorMessage : result ? "اكتمل آخر اختبار وحُفظ محليًا ضمن سجل هذه الشبكة." : "الاختبار لا يبدأ تلقائيًا لحماية بياناتك."}</Text></StatusBanner><View style={{ flexDirection: "row-reverse", gap: 12 }}><View style={{ flex: 1 }}><MetricCard compact title="التنزيل" value={mbps(result?.downloadMbps)} /></View><View style={{ flex: 1 }}><MetricCard compact title="الرفع" value={mbps(result?.uploadMbps)} /></View></View><MetricCard title="زمن الاستجابة" value={result?.latencyMs === null || result?.latencyMs === undefined ? "—" : `${Math.round(result.latencyMs)} ms`} hint={failed ? "تحقق من اتصال الإنترنت وأعد المحاولة." : "كلما انخفض الزمن تحسنت الاستجابة."} /><PrimaryButton label="تشغيل الاختبار" loading={busy} onPress={() => void run()} /></ScrollView></ScreenContainer></ScreenTransition>;
}
