import { Alert, Platform, Share } from "react-native";
import { csvExport } from "./analytics";
import type { Store } from "./types";

export async function shareCsv(store: Store): Promise<boolean> {
  const csv = csvExport(store);
  if (Platform.OS === "web") { Alert.alert("التصدير غير متاح", "استخدم تطبيق Android لمشاركة ملف CSV من سجل الاستخدام المحلي."); return false; }
  try { await Share.share({ title: "تصدير بيانات NetMeter", message: csv }); return true; } catch { return false; }
}
