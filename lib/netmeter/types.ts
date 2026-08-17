export type ConnectionKind = "wifi" | "cellular" | "ethernet" | "vpn" | "other" | "offline" | "unknown";
export interface NetworkIdentity { id: string; label: string; kind: ConnectionKind; ipAddress: string | null; }
export interface NetworkSnapshot { network: NetworkIdentity; internetReachable: boolean; receivedBytes: number | null; transmittedBytes: number | null; capturedAt: string; usageAccessGranted: boolean; nativeCapabilities: boolean; }
export interface DailyUsage { date: string; receivedBytes: number; transmittedBytes: number; }
export interface NetworkRecord { id: string; label: string; kind: ConnectionKind; lastSeenAt: string; daily: Record<string, DailyUsage>; }
export interface SpeedResult { id: string; networkId: string; measuredAt: string; downloadMbps: number | null; uploadMbps: number | null; latencyMs: number | null; errorMessage?: string; }
export interface Settings { dailyLimitBytes: number | null; foregroundMonitor: boolean; }
export interface Store { version: 1; baseline: { networkId: string; receivedBytes: number | null; transmittedBytes: number | null } | null; networks: Record<string, NetworkRecord>; speedResults: SpeedResult[]; settings: Settings; }
export interface Dashboard { snapshot: NetworkSnapshot | null; network: NetworkRecord | null; usage: DailyUsage | null; lastSpeed: SpeedResult | null; settings: Settings; }
