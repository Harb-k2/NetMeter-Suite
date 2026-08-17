import { requireNativeModule } from "expo-modules-core";
import type { ConnectionKind } from "./types";
export type NativeSnapshot = { networkId: string; networkLabel: string; connectionKind: ConnectionKind; ipAddress: string | null; internetReachable: boolean; receivedBytes: number | null; transmittedBytes: number | null; usageAccessGranted: boolean; };
type NativeApi = { getSnapshot(): Promise<NativeSnapshot>; openUsageAccessSettings(): Promise<boolean>; startForegroundMonitoring(): Promise<boolean>; stopForegroundMonitoring(): Promise<boolean>; };
let module: NativeApi | null = null; try { module = requireNativeModule<NativeApi>("ExpoNetmeterNative"); } catch { module = null; } export const NativeNetMeter = module;
