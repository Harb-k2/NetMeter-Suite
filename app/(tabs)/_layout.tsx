import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabsLayout() {
  const colors = useColors(); const insets = useSafeAreaInsets(); const bottom = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ headerShown: false, tabBarButton: HapticTab, tabBarActiveTintColor: colors.tint, tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, height: 56 + bottom, paddingBottom: bottom, paddingTop: 8 } }}>
    <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={25} color={color} /> }} />
    <Tabs.Screen name="speed" options={{ title: "السرعة", tabBarIcon: ({ color }) => <IconSymbol name="gauge" size={25} color={color} /> }} />
    <Tabs.Screen name="networks" options={{ title: "الشبكات", tabBarIcon: ({ color }) => <IconSymbol name="wifi" size={25} color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: "الإعدادات", tabBarIcon: ({ color }) => <IconSymbol name="gear" size={25} color={color} /> }} />
  </Tabs>;
}
