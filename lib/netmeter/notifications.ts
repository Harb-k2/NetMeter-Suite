import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { UsageAlertLevel } from "./usage-alert";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function prepareUsageNotifications(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("usage-limits", { name: "حدود استهلاك البيانات", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 150, 250], lightColor: "#F59E0B" });
  }
  const current = await Notifications.getPermissionsAsync();
  const status = current.status === "granted" ? current.status : (await Notifications.requestPermissionsAsync()).status;
  return status === "granted";
}

export async function notifyUsageLimit(level: UsageAlertLevel, networkLabel: string, totalBytes: number, limitBytes: number): Promise<void> {
  if (!(await prepareUsageNotifications())) return;
  const formatMb = (value: number) => `${(value / 1024 / 1024).toFixed(value >= 1024 * 1024 * 100 ? 0 : 1)} م.ب`;
  const exceeded = level === "exceeded";
  await Notifications.scheduleNotificationAsync({
    content: {
      title: exceeded ? "تم تجاوز حد البيانات" : "اقتربت من حد البيانات",
      body: `${networkLabel}: استخدمت ${formatMb(totalBytes)} من أصل ${formatMb(limitBytes)}.`,
      data: { screen: "settings", level },
      sound: "default",
    },
    trigger: null,
  });
}
