import { describe, expect, it } from "vitest";
import { csvExport, monthTotal, series } from "../lib/netmeter/analytics";
import type { NetworkRecord, Store } from "../lib/netmeter/types";

const network: NetworkRecord = { id: "wifi:home", label: "Home", kind: "wifi", lastSeenAt: "2026-08-17T00:00:00.000Z", daily: { "2026-08-16": { date: "2026-08-16", receivedBytes: 100, transmittedBytes: 50 }, "2026-08-17": { date: "2026-08-17", receivedBytes: 200, transmittedBytes: 20 } } };
const store = { version: 1, baseline: null, networks: { [network.id]: network }, speedResults: [], settings: { dailyLimitBytes: null, warningPercentage: 80, foregroundMonitor: false, notificationsEnabled: true, themeMode: "system", reduceMotion: false }, alertedLimits: {}, alertHistory: [] } as Store;
describe("التحليلات", () => { it("يحسب مجموع الشهر", () => expect(monthTotal(network, "2026-08")).toBe(370)); it("يعيد سلسلة بعدد أيام محدد", () => expect(series(network, 2, new Date("2026-08-17T12:00:00Z"))).toHaveLength(2)); it("ينشئ CSV يحتوي سجل الشبكة", () => expect(csvExport(store)).toContain('"Home"')); });
