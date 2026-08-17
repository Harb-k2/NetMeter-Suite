import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AccessibilityInfo } from "react-native";

type MotionContextValue = { reduceMotion: boolean; systemReduceMotion: boolean; setReduceMotion: (value: boolean) => void };
const MotionContext = createContext<MotionContextValue | null>(null);
const KEY = "netmeter-suite:reduce-motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  useEffect(() => { void AsyncStorage.getItem(KEY).then((value) => setReduceMotionState(value === "true")); const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReduceMotion); void AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduceMotion); return () => subscription.remove(); }, []);
  const setReduceMotion = useCallback((value: boolean) => { setReduceMotionState(value); void AsyncStorage.setItem(KEY, String(value)); }, []);
  const value = useMemo(() => ({ reduceMotion: reduceMotion || systemReduceMotion, systemReduceMotion, setReduceMotion }), [reduceMotion, setReduceMotion, systemReduceMotion]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
export function useMotionPreference() { const context = useContext(MotionContext); if (!context) throw new Error("useMotionPreference must be used within MotionProvider"); return context; }
