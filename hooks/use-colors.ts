import { useMemo } from "react";
import { paletteFor, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { useThemeContext } from "@/lib/theme-provider";

/** Returns the palette for the active scheme and the user-selected primary color. */
export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const { colorScheme, accentColor } = useThemeContext();
  const scheme = colorSchemeOverride ?? colorScheme ?? "light";
  return useMemo(() => paletteFor(scheme, accentColor), [accentColor, scheme]);
}
