import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { MetricCard } from "@/components/netmeter/card";
import { mbps } from "@/lib/netmeter/format";
import { snapshot } from "@/lib/netmeter/network";
import { measure } from "@/lib/netmeter/speed";
import { saveSpeed } from "@/lib/netmeter/storage";
import type { SpeedResult } from "@/lib/netmeter/types";
import { useColors } from "@/hooks/use-colors";

export default function SpeedScreen() {
  const colors = useColors(); const [result, setResult] = useState<SpeedResult | null>(null); const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { const current = await snapshot(), value = await measure(current.network.id); await saveSpeed(value); setResult(value); } finally { setBusy(false); } };
  return <ScreenContainer className="px-5"><ScrollView contentContainerStyle={{ paddingVertical: 18, gap: 14 }}><Text style={{ color: colors.foreground, textAlign: "right", fontSize: 28, fontWeight: "800" }}>قياس السرعة</Text><Text style={{ color: colors.muted, textAlign: "right", lineHeight: 20 }}>يعمل الاختبار عند طلبك فقط، وقد يستهلك نحو 2.5 م.ب من البيانات.</Text><View style={{ flexDirection: "row-reverse", gap: 12 }}><View style={{ flex: 1 }}><MetricCard title="التنزيل" value={mbps(result?.downloadMbps)} /></View><View style={{ flex: 1 }}><MetricCard title="الرفع" value={mbps(result?.uploadMbps)} /></View></View><MetricCard title="زمن الاستجابة" value={result?.latencyMs === null || result?.latencyMs === undefined ? "—" : `${Math.round(result.latencyMs)} ms`} hint={result?.errorMessage} /><Pressable disabled={busy} onPress={() => void run()} style={({ pressed }) => ({ backgroundColor: colors.tint, padding: 17, borderRadius: 16, opacity: busy || pressed ? 0.72 : 1 })}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800", fontSize: 16 }}>تشغيل الاختبار</Text>}</Pressable></ScrollView></ScreenContainer>;
}
