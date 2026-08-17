import { Pressable, Switch, Text, View } from "react-native";
import type { ThemeMode } from "@/lib/netmeter/types";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { useMotionPreference } from "@/lib/motion-provider";

const OPTIONS: { mode: ThemeMode; label: string }[] = [{ mode: "system", label: "تلقائي" }, { mode: "light", label: "فاتح" }, { mode: "dark", label: "ليلي" }];
export function AppearanceSection() {
  const colors = useColors(); const { themeMode, setThemeMode } = useThemeContext(); const { reduceMotion, systemReduceMotion, setReduceMotion } = useMotionPreference();
  return <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 11 }}><Text style={{ color: colors.foreground, textAlign: "right", fontWeight: "800" }}>المظهر والحركة</Text><Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>اختر مظهرًا يدويًا أو دع التطبيق يتبع إعداد الجهاز.</Text><View style={{ flexDirection: "row-reverse", gap: 8 }}>{OPTIONS.map((option) => <Pressable key={option.mode} onPress={() => setThemeMode(option.mode)} style={{ flex: 1, borderRadius: 12, paddingVertical: 10, backgroundColor: themeMode === option.mode ? colors.tint : colors.background, borderWidth: 1, borderColor: themeMode === option.mode ? colors.tint : colors.border }}><Text style={{ color: themeMode === option.mode ? "#fff" : colors.foreground, textAlign: "center", fontWeight: "800", fontSize: 12 }}>{option.label}</Text></Pressable>)}</View><View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}><View style={{ flex: 1 }}><Text style={{ color: colors.foreground, textAlign: "right", fontWeight: "800" }}>تقليل الحركة</Text><Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>{systemReduceMotion ? "إعداد الجهاز يطلب تقليل الحركة حاليًا." : "يلغي انتقالات الواجهة لتجربة أكثر هدوءًا."}</Text></View><Switch value={reduceMotion} onValueChange={setReduceMotion} trackColor={{ true: colors.tint }} /></View></View>;
}
