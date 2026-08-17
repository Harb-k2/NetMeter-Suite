import { Text, View } from "react-native";
import { bytes } from "@/lib/netmeter/format";
import type { CalendarDay } from "@/lib/netmeter/analytics";
import { useColors } from "@/hooks/use-colors";

export function MonthCalendar({ days, firstWeekday }: { days: CalendarDay[]; firstWeekday: number }) {
  const colors = useColors(); const max = Math.max(1, ...days.map((day) => day.totalBytes)); const blanks = Array.from({ length: firstWeekday }, (_, index) => `blank-${index}`);
  return <View style={{ gap: 7 }}><View style={{ flexDirection: "row-reverse" }}>{["أ", "إ", "ث", "أر", "خ", "ج", "س"].map((day) => <Text key={day} style={{ width: "14.28%", color: colors.muted, textAlign: "center", fontSize: 11 }}>{day}</Text>)}</View><View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 0 }}>{blanks.map((key) => <View key={key} style={{ width: "14.28%", aspectRatio: 1 }} />)}{days.map((day) => { const intensity = day.totalBytes ? 0.18 + 0.72 * day.totalBytes / max : 0; return <View key={day.date} style={{ width: "14.28%", aspectRatio: 1, padding: 2 }}><View style={{ flex: 1, borderRadius: 9, backgroundColor: day.totalBytes ? colors.tint : colors.background, opacity: day.totalBytes ? intensity : 1, justifyContent: "center", alignItems: "center" }}><Text style={{ color: day.totalBytes ? "#fff" : colors.muted, fontSize: 12, fontWeight: day.totalBytes ? "800" : "400" }}>{day.day}</Text></View></View>; })}</View><Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>كلما زادت كثافة اللون زاد الاستهلاك اليومي. أعلى يوم: {bytes(Math.max(...days.map((day) => day.totalBytes), 0))}</Text></View>;
}
