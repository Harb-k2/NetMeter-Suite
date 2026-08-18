import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { MetricCard } from "@/components/netmeter/card";
import { InsightCard, PrimaryButton, ScreenHeader, StatusBanner } from "@/components/netmeter/ui";
import { ScreenTransition } from "@/components/netmeter/screen-transition";
import { mbps } from "@/lib/netmeter/format";
import { snapshot } from "@/lib/netmeter/network";
import { measure } from "@/lib/netmeter/speed";
import { saveSpeed } from "@/lib/netmeter/storage";
import type { SpeedResult } from "@/lib/netmeter/types";
import { useColors } from "@/hooks/use-colors";

function quality(result: SpeedResult | null) {
  if (!result || result.errorMessage) return { value: "بانتظار نتيجة", detail: "يظهر التقييم بعد اكتمال اختبار صالح.", tone: "neutral" as const };
  if ((result.downloadMbps ?? 0) >= 50 && (result.latencyMs ?? 999) <= 45) return { value: "جودة ممتازة", detail: "مزيج جيد من سرعة التنزيل وزمن الاستجابة.", tone: "success" as const };
  if ((result.downloadMbps ?? 0) >= 10 && (result.latencyMs ?? 999) <= 120) return { value: "جودة مستقرة", detail: "ملائمة للتصفح والعمل اليومي.", tone: "neutral" as const };
  return { value: "جودة محدودة", detail: "أعد المحاولة قرب نقطة الاتصال أو في وقت أقل ازدحامًا.", tone: "warning" as const };
}

export default function SpeedScreen() {
  const colors = useColors();
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [networkLabel, setNetworkLabel] = useState<string | null>(null);
  const [stage, setStage] = useState("جاهز للاختبار");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const run = async () => {
    setBusy(true); setRuntimeError(null); setStage("فحص الشبكة الحالية…");
    try {
      const current = await snapshot();
      setNetworkLabel(current.network.label); setStage("قياس التنزيل والرفع وزمن الاستجابة…");
      const value = await measure(current.network.id);
      await saveSpeed(value); setResult(value); setStage(value.errorMessage ? "اكتمل الاختبار مع ملاحظة" : "اكتمل وحُفظ محليًا");
    } catch {
      setRuntimeError("تعذر إكمال الاختبار. تحقق من الإنترنت ثم أعد المحاولة."); setStage("تعذر الاختبار");
    } finally { setBusy(false); }
  };
  const failed = Boolean(runtimeError || result?.errorMessage);
  const assessment = quality(result);
  return <ScreenTransition><ScreenContainer className="px-5"><ScrollView contentContainerStyle={{ paddingVertical: 18, gap: 14 }} showsVerticalScrollIndicator={false}>
    <ScreenHeader title="قياس السرعة" subtitle="اختبر اتصال الشبكة الحالية عند الطلب فقط. قد يستهلك الاختبار قرابة 2.5 م.ب من البيانات." badge={networkLabel ? `آخر اختبار: ${networkLabel}` : "اختبار يدوي"} />
    <StatusBanner tone={busy ? "neutral" : failed ? "error" : result ? "success" : "neutral"}><Text style={{ color: failed ? colors.error : result && !busy ? colors.success : colors.tint, textAlign: "right", fontSize: 13, fontWeight: "800" }}>{runtimeError ?? (result?.errorMessage ?? stage)}</Text></StatusBanner>
    <View style={{ flexDirection: "row-reverse", gap: 12 }}><View style={{ flex: 1 }}><MetricCard compact title="التنزيل" value={mbps(result?.downloadMbps)} /></View><View style={{ flex: 1 }}><MetricCard compact title="الرفع" value={mbps(result?.uploadMbps)} /></View></View>
    <MetricCard title="زمن الاستجابة" value={result?.latencyMs === null || result?.latencyMs === undefined ? "—" : `${Math.round(result.latencyMs)} ms`} hint={failed ? "تحقق من اتصال الإنترنت وأعد المحاولة." : "كلما انخفض الزمن تحسنت الاستجابة."} />
    <InsightCard title="تقييم آخر اتصال" value={assessment.value} detail={assessment.detail} tone={assessment.tone} />
    <PrimaryButton label="تشغيل الاختبار" loading={busy} loadingLabel="جارِ قياس الاتصال…" onPress={() => void run()} />
  </ScrollView></ScreenContainer></ScreenTransition>;
}
