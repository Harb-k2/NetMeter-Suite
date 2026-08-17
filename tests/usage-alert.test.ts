import { describe, expect, it } from "vitest";
import { isStrongerAlert, usageAlertLevel } from "../lib/netmeter/usage-alert";

describe("usageAlertLevel", () => {
  const limit = 1000;
  it("لا ينشئ تنبيهًا قبل بلوغ 80٪", () => expect(usageAlertLevel(799, limit)).toBeNull());
  it("ينشئ تحذيرًا عند 80٪", () => expect(usageAlertLevel(800, limit)).toBe("warning"));
  it("ينشئ تنبيه تجاوز عند 100٪", () => expect(usageAlertLevel(1000, limit)).toBe("exceeded"));
  it("يرقي التحذير ولا يكرر المستوى نفسه", () => { expect(isStrongerAlert("exceeded", "warning")).toBe(true); expect(isStrongerAlert("warning", "warning")).toBe(false); });
});
