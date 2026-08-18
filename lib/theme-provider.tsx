import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isAccentColor, paletteFor, SchemeColors, type ColorScheme } from "@/constants/theme";
import type { AccentColor, ThemeMode } from "@/lib/netmeter/types";

type ThemeContextValue = { colorScheme: ColorScheme; themeMode: ThemeMode; accentColor: AccentColor; setThemeMode: (mode: ThemeMode) => void; setAccentColor: (color: AccentColor) => void; setColorScheme: (scheme: ColorScheme) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = "netmeter-suite:theme-mode";
const ACCENT_KEY = "netmeter-suite:accent-color";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = (useSystemColorScheme() ?? "light") as ColorScheme;
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [accentColor, setAccentColorState] = useState<AccentColor>("blue");
  const colorScheme: ColorScheme = themeMode === "system" ? systemScheme : themeMode;
  const applyScheme = useCallback((scheme: ColorScheme, accent: AccentColor) => {
    const palette = paletteFor(scheme, accent);
    nativewindColorScheme.set(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      Object.entries(SchemeColors[scheme]).forEach(([token, value]) => root.style.setProperty(`--color-${token}`, value));
      root.style.setProperty("--color-primary", palette.primary);
    }
  }, []);
  useEffect(() => {
    void AsyncStorage.multiGet([THEME_KEY, ACCENT_KEY]).then((values) => {
      const mode = values[0]?.[1];
      const accent = values[1]?.[1];
      if (mode === "system" || mode === "light" || mode === "dark") setThemeModeState(mode);
      if (isAccentColor(accent)) setAccentColorState(accent);
    });
  }, []);
  useEffect(() => { applyScheme(colorScheme, accentColor); }, [accentColor, applyScheme, colorScheme]);
  const setThemeMode = useCallback((mode: ThemeMode) => { setThemeModeState(mode); void AsyncStorage.setItem(THEME_KEY, mode); Appearance.setColorScheme?.(mode === "system" ? null : mode); }, []);
  const setAccentColor = useCallback((color: AccentColor) => { setAccentColorState(color); void AsyncStorage.setItem(ACCENT_KEY, color); }, []);
  const themeVariables = useMemo(() => {
    const palette = paletteFor(colorScheme, accentColor);
    return vars(Object.fromEntries(Object.entries({ ...SchemeColors[colorScheme], primary: palette.primary }).map(([token, value]) => [`color-${token}`, value])));
  }, [accentColor, colorScheme]);
  const setColorScheme = useCallback((scheme: ColorScheme) => setThemeMode(scheme), [setThemeMode]);
  const value = useMemo(() => ({ colorScheme, themeMode, accentColor, setThemeMode, setAccentColor, setColorScheme }), [accentColor, colorScheme, setAccentColor, setColorScheme, setThemeMode, themeMode]);
  return <ThemeContext.Provider value={value}><View style={[{ flex: 1 }, themeVariables]}>{children}</View></ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemeContext must be used within ThemeProvider");
  return context;
}
