import { type ReactNode } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { useMotionPreference } from "@/lib/motion-provider";

export function ScreenTransition({ children }: { children: ReactNode }) {
  const { reduceMotion } = useMotionPreference();
  return <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(210)} style={{ flex: 1 }}>{children}</Animated.View>;
}
