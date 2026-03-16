/**
 * Scene 7: Outro - 4s (120 frames)
 */

import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";
import { T, LOGO_PATH } from "../design";
import { SceneFade, FadeIn } from "../components";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 12, mass: 0.8, stiffness: 160 } });
  const logoOpacity = interpolate(frame, [10, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowOpacity = interpolate(frame, [24, 50, 80, 120], [0, 0.5, 0.3, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const nameOpacity = interpolate(frame, [30, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nameY = interpolate(frame, [30, 48], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <SceneFade fadeIn={10} fadeOut={25}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle, ${T.primary}50 0%, transparent 70%)`, filter: "blur(30px)", opacity: glowOpacity }} />
          <div style={{ width: 92, height: 92, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <svg viewBox="0 0 16 16" width={72} height={72} fill={T.fg}><path d={LOGO_PATH} /></svg>
          </div>
        </div>
        <div style={{ opacity: nameOpacity, transform: `translateY(${nameY}px)`, marginTop: 24 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: T.fg, letterSpacing: "-0.03em" }}>PocketWatch</div>
        </div>
        <FadeIn delay={50} duration={16}>
          <div style={{ fontSize: 18, color: T.fgSecondary, marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>
            Your entire financial life, unified.
          </div>
        </FadeIn>
      </AbsoluteFill>
    </SceneFade>
  );
};
