import { describe, expect, it } from "vitest";
import themeConfig from "../theme.config";

describe("ألوان مظهر NetMeter", () => {
  it("يطبق اللون المختار على عناصر التأكيد في الوضعين", () => {
    expect(themeConfig.accentColors.teal.light).toBe("#00897B");
    expect(themeConfig.accentColors.violet.dark).toBe("#A78BFA");
  });

  it("لا يقبل إلا الألوان الرئيسية المحددة", () => {
    expect(Object.keys(themeConfig.accentColors)).toEqual(["blue", "teal", "violet", "amber"]);
  });
});
