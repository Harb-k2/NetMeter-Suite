import { Text, View } from "react-native";
import { bytes } from "@/lib/netmeter/format";
import type { UsagePoint } from "@/lib/netmeter/analytics";
import { useColors } from "@/hooks/use-colors";

export function UsageChart({ points }: { points: UsagePoint[] }) {
  const colors = useColors(); const max = Math.max(1, ...points.map((point) => point.totalBytes)); const total = points.reduce((sum, point) => sum + point.totalBytes, 0);
  return <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 16, gap: 12 }}><View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}><Text style={{ color: colors.foreground, fontWeight: "800" }}>استهلاك آخر 7 أيام</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{bytes(total)}</Text></View><View style={{ height: 120, flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "space-between", gap: 7 }}>{points.map((point) => <View key={point.date} style={{ flex: 1, alignItems: "center", gap: 6, justifyContent: "flex-end" }}><View style={{ width: "100%", minHeight: 5, maxHeight: 88, height: `${Math.max(5, (point.totalBytes / max) * 88)}%`, backgroundColor: point.totalBytes === 0 ? colors.border : colors.tint, borderRadius: 10 }} /><Text numberOfLines={1} style={{ color: colors.muted, fontSize: 9 }}>{point.date.slice(8)}</Text></View>)}</View></View>;
}
