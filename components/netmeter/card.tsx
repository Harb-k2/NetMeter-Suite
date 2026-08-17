import { type ReactNode } from "react";
import { Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
export function MetricCard({ title, value, hint, children }: { title: string; value: string; hint?: string; children?: ReactNode }) { const colors = useColors(); return <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 18, gap: 6 }}><Text style={{ color: colors.muted, textAlign: "right", fontSize: 13 }}>{title}</Text><Text style={{ color: colors.foreground, textAlign: "right", fontSize: 26, fontWeight: "800" }}>{value}</Text>{hint ? <Text style={{ color: colors.muted, textAlign: "right", fontSize: 12 }}>{hint}</Text> : null}{children}</View>; }
