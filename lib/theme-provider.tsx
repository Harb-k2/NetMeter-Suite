import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SchemeColors, type ColorScheme } from "@/constants/theme";
import type { ThemeMode } from "@/lib/netmeter/types";

type ThemeContextValue = { colorScheme: ColorScheme; themeMode: ThemeMode; setThemeMode: (mode: ThemeMode) => void; setColorScheme: (scheme: ColorScheme) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const KEY = "netmeter-suite:theme-mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = (useSystemColorScheme() ?? "light") as ColorScheme;
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const colorScheme: ColorScheme = themeMode === "system" ? systemScheme : themeMode;
  const applyScheme = useCallback((scheme: ColorScheme) => { nativewindColorScheme.set(scheme); if (typeof document !== "undefined") { const root = document.documentElement; root.dataset.theme = scheme; root.classList.toggle("dark", scheme === "dark"); Object.entries(SchemeColors[scheme]).forEach(([token, value]) => root.style.setProperty(`--color-${token}`, value)); } }, []);
  useEffect(() => { void AsyncStorage.getItem(KEY).then((mode) => { if (mode === "system" || mode === "light" || mode === "dark") setThemeModeState(mode); }); }, []);
  useEffect(() => { applyScheme(colorScheme); }, [applyScheme, colorScheme]);
  const setThemeMode = useCallback((mode: ThemeMode) => { setThemeModeState(mode); void AsyncStorage.setItem(KEY, mode); Appearance.setColorScheme?.(mode === "system" ? null : mode); }, []);
  const themeVariables = useMemo(() => vars(Object.fromEntries(Object.entries(SchemeColors[colorScheme]).map(([token, value]) => [`color-${token}`, value]))), [colorScheme]);
  const setColorScheme = useCallback((scheme: ColorScheme) => setThemeMode(scheme), [setThemeMode]);
  const value = useMemo(() => ({ colorScheme, themeMode, setThemeMode, setColorScheme }), [colorScheme, themeMode, setThemeMode, setColorScheme]);
  return <ThemeContext.Provider value={value}><View style={[{ flex: 1 }, themeVariables]}>{children}</View></ThemeContext.Provider>;
}
export function useThemeContext() { const context = useContext(ThemeContext); if (!context) throw new Error("useThemeContext must be used within ThemeProvider"); return context; }
