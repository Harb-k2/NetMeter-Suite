import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

export function ScreenHeader({ title, subtitle, badge }: { title: string; subtitle: string; badge?: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 7 }}>
      {badge ? <View style={{ alignSelf: "flex-end", backgroundColor: `${colors.tint}18`, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}><Text style={{ color: colors.tint, fontSize: 12, fontWeight: "700" }}>{badge}</Text></View> : null}
      <Text style={{ color: colors.foreground, textAlign: "right", fontSize: 30, lineHeight: 38, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: colors.muted, textAlign: "right", lineHeight: 21 }}>{subtitle}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress, loading = false, loadingLabel = "جارِ التنفيذ…", disabled = false, icon }: { label: string; onPress: () => void; loading?: boolean; loadingLabel?: string; disabled?: boolean; icon?: ReactNode }) {
  const colors = useColors();
  const inactive = loading || disabled;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onPress={onPress} style={({ pressed }) => ({ alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 8, minHeight: 54, borderRadius: 17, paddingHorizontal: 18, backgroundColor: colors.tint, opacity: inactive ? 0.58 : pressed ? 0.86 : 1, transform: [{ scale: pressed && !inactive ? 0.985 : 1 }] })}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : icon}
      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}>{loading ? loadingLabel : label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled = false, hint }: { label: string; onPress: () => void; disabled?: boolean; hint?: string }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityHint={hint} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ alignItems: "center", justifyContent: "center", minHeight: 50, borderRadius: 16, paddingHorizontal: 14, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}>
      <Text style={{ color: colors.tint, textAlign: "center", fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

export function StatusBanner({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "error"; children: ReactNode }) {
  const colors = useColors();
  const color = tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "error" ? colors.error : colors.tint;
  return <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 9, borderRadius: 15, borderColor: `${color}35`, borderWidth: 1, backgroundColor: `${color}12`, paddingHorizontal: 13, paddingVertical: 11 }}><View style={{ width: 8, height: 8, borderRadius: 8, backgroundColor: color }} /><View style={{ flex: 1 }}>{children}</View></View>;
}

export function UsageProgress({ percent, detail, label = "نسبة الحد اليومي" }: { percent: number; detail: string; label?: string }) {
  const colors = useColors();
  const value = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const color = value >= 100 ? colors.error : value >= 80 ? colors.warning : colors.success;
  return (
    <View style={{ gap: 8, marginTop: 5 }}>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}><Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text><Text style={{ color, fontSize: 12, fontWeight: "800" }}>{value.toFixed(0)}٪</Text></View>
      <View style={{ height: 9, borderRadius: 20, backgroundColor: colors.border, overflow: "hidden" }}><View style={{ height: "100%", width: `${value}%`, borderRadius: 20, backgroundColor: color }} /></View>
      <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12, lineHeight: 18 }}>{detail}</Text>
    </View>
  );
}

export function InsightCard({ title, value, detail, tone = "neutral" }: { title: string; value: string; detail: string; tone?: "neutral" | "success" | "warning" | "error" }) {
  const colors = useColors();
  const color = tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "error" ? colors.error : colors.tint;
  return <View style={{ borderRadius: 17, borderWidth: 1, borderColor: `${color}32`, backgroundColor: `${color}0F`, padding: 14, gap: 4 }}><Text style={{ color: colors.muted, textAlign: "right", fontSize: 12, fontWeight: "700" }}>{title}</Text><Text style={{ color, textAlign: "right", fontSize: 18, fontWeight: "800" }}>{value}</Text><Text style={{ color: colors.muted, textAlign: "right", fontSize: 12, lineHeight: 17 }}>{detail}</Text></View>;
}
