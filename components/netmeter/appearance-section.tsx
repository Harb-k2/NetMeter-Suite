import { Pressable, Switch, Text, View } from "react-native";
import { AccentColors } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { useMotionPreference } from "@/lib/motion-provider";
import { useThemeContext } from "@/lib/theme-provider";
import type { AccentColor, ThemeMode } from "@/lib/netmeter/types";

const MODES: { mode: ThemeMode; label: string }[] = [{ mode: "system", label: "تلقائي" }, { mode: "light", label: "فاتح" }, { mode: "dark", label: "ليلي" }];
const ACCENTS: { color: AccentColor; label: string }[] = [{ color: "blue", label: "أزرق" }, { color: "teal", label: "فيروزي" }, { color: "violet", label: "بنفسجي" }, { color: "amber", label: "كهرماني" }];

export function AppearanceSection() {
  const colors = useColors();
  const { colorScheme, themeMode, accentColor, setThemeMode, setAccentColor } = useThemeContext();
  const { reduceMotion, systemReduceMotion, setReduceMotion } = useMotionPreference();
  return <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border }}>
    <Text style={{ color: colors.foreground, textAlign: "right", fontWeight: "800" }}>المظهر والحركة</Text>
    <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12, lineHeight: 18 }}>اختر المظهر واللون الرئيسي. يُطبّق اللون فورًا ويُحفظ محليًا على هذا الجهاز.</Text>
    <View style={{ flexDirection: "row-reverse", gap: 8 }}>{MODES.map((option) => <Pressable key={option.mode} accessibilityRole="button" accessibilityState={{ selected: themeMode === option.mode }} onPress={() => setThemeMode(option.mode)} style={({ pressed }) => ({ flex: 1, borderRadius: 12, paddingVertical: 10, backgroundColor: themeMode === option.mode ? colors.tint : colors.background, borderWidth: 1, borderColor: themeMode === option.mode ? colors.tint : colors.border, opacity: pressed ? 0.78 : 1 })}><Text style={{ color: themeMode === option.mode ? "#fff" : colors.foreground, textAlign: "center", fontWeight: "800", fontSize: 12 }}>{option.label}</Text></Pressable>)}</View>
    <View style={{ marginTop: 3, gap: 7 }}>
      <Text style={{ color: colors.foreground, textAlign: "right", fontWeight: "800" }}>لون المظهر الرئيسي</Text>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>{ACCENTS.map((option) => {
        const selected = accentColor === option.color;
        const swatch = AccentColors[option.color][colorScheme];
        return <Pressable key={option.color} accessibilityRole="button" accessibilityLabel={`اختيار اللون ${option.label}`} accessibilityState={{ selected }} onPress={() => setAccentColor(option.color)} style={({ pressed }) => ({ width: "48%", flexGrow: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1.5, borderColor: selected ? swatch : colors.border, backgroundColor: selected ? colors.background : colors.surface, opacity: pressed ? 0.72 : 1 })}>
          <Text style={{ color: colors.foreground, fontWeight: selected ? "800" : "600", textAlign: "right" }}>{option.label}</Text>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: swatch, borderWidth: selected ? 3 : 1, borderColor: selected ? colors.foreground : "rgba(0,0,0,0.12)" }} />
        </Pressable>;
      })}</View>
    </View>
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}><View style={{ flex: 1 }}><Text style={{ color: colors.foreground, textAlign: "right", fontWeight: "800" }}>تقليل الحركة</Text><Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>{systemReduceMotion ? "إعداد الجهاز يطلب تقليل الحركة حاليًا." : "يلغي انتقالات الواجهة لتجربة أكثر هدوءًا."}</Text></View><Switch value={reduceMotion} onValueChange={setReduceMotion} trackColor={{ true: colors.tint }} /></View>
  </View>;
}
