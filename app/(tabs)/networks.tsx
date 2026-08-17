import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { bytes } from "@/lib/netmeter/format";
import { load, sortedNetworks } from "@/lib/netmeter/storage";
import type { NetworkRecord } from "@/lib/netmeter/types";
import { useColors } from "@/hooks/use-colors";

export default function NetworksScreen() {
  const colors = useColors(); const [items, setItems] = useState<NetworkRecord[]>([]); const refresh = useCallback(async () => setItems(sortedNetworks(await load())), []); useEffect(() => { void refresh(); }, [refresh]);
  return <ScreenContainer className="px-5"><FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingVertical: 18, gap: 10 }} ListHeaderComponent={<View style={{ gap: 6, marginBottom: 8 }}><Text style={{ color: colors.foreground, textAlign: "right", fontSize: 28, fontWeight: "800" }}>الشبكات</Text><Text style={{ color: colors.muted, textAlign: "right" }}>لكل شبكة سجل استخدام مستقل</Text></View>} ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: "center", marginTop: 60 }}>لم تسجل أي شبكة بعد.</Text>} renderItem={({ item }) => { const total = Object.values(item.daily).reduce((sum, day) => sum + day.receivedBytes + day.transmittedBytes, 0); return <Pressable style={({ pressed }) => ({ padding: 16, backgroundColor: colors.surface, borderRadius: 18, borderColor: colors.border, borderWidth: 1, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.foreground, textAlign: "right", fontWeight: "800", fontSize: 16 }}>{item.label}</Text><Text style={{ color: colors.muted, textAlign: "right", marginTop: 5 }}>{bytes(total)} · آخر ظهور {new Date(item.lastSeenAt).toLocaleDateString("ar")}</Text></Pressable>; }} ListFooterComponent={<Pressable onPress={() => void refresh()} style={{ padding: 18 }}><Text style={{ color: colors.tint, textAlign: "center", fontWeight: "700" }}>تحديث السجل</Text></Pressable>} /></ScreenContainer>;
}
