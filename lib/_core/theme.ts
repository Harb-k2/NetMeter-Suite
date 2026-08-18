import { Platform } from "react-native";
import themeConfig from "@/theme.config";
import type { AccentColor } from "@/lib/netmeter/types";

export type ColorScheme = "light" | "dark";
export const ThemeColors = themeConfig.themeColors;
export const AccentColors = themeConfig.accentColors;

type ThemeColorTokens = typeof ThemeColors;
type ThemeColorName = keyof ThemeColorTokens;
type SchemePalette = Record<ColorScheme, Record<ThemeColorName, string>>;
type SchemePaletteItem = SchemePalette[ColorScheme];

function buildSchemePalette(colors: ThemeColorTokens): SchemePalette {
  const palette: SchemePalette = { light: {} as SchemePalette["light"], dark: {} as SchemePalette["dark"] };
  (Object.keys(colors) as ThemeColorName[]).forEach((name) => {
    const swatch = colors[name];
    palette.light[name] = swatch.light;
    palette.dark[name] = swatch.dark;
  });
  return palette;
}

export const SchemeColors = buildSchemePalette(ThemeColors);
export const isAccentColor = (value: string | null | undefined): value is AccentColor => Boolean(value && value in AccentColors);

type RuntimePalette = SchemePaletteItem & { text: string; background: string; tint: string; icon: string; tabIconDefault: string; tabIconSelected: string; border: string };

export function paletteFor(scheme: ColorScheme, accent: AccentColor = "blue"): RuntimePalette {
  const base = SchemeColors[scheme];
  const selected = AccentColors[accent] ?? AccentColors.blue;
  const primary = selected[scheme];
  return { ...base, primary, text: base.foreground, background: base.background, tint: primary, icon: base.muted, tabIconDefault: base.muted, tabIconSelected: primary, border: base.border };
}

export const Colors = { light: paletteFor("light"), dark: paletteFor("dark") } satisfies Record<ColorScheme, RuntimePalette>;
export type ThemeColorPalette = RuntimePalette;

export const Fonts = Platform.select({
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: { sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", serif: "Georgia, 'Times New Roman', serif", rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic Pro', Meiryo, 'MS PGothic', sans-serif", mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
});
