/**
 * Scene 1: Logo reveal — 3s (90 frames)
 */

import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Easing } from "remotion";
import { T, LOGO_PATH } from "../design";
import { SceneFade } from "../components";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 6, fps, config: { damping: 12, mass: 0.8, stiffness: 160 } });
  const logoOpacity = interpolate(frame, [6, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowOpacity = interpolate(frame, [18, 40, 60], [0, 0.6, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const textOpacity = interpolate(frame, [25, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textY = interpolate(frame, [25, 42], [22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const tagOpacity = interpolate(frame, [45, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [45, 60], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <SceneFade fadeIn={1} fadeOut={10}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${T.primary}60 0%, transparent 70%)`, filter: "blur(20px)", opacity: glowOpacity }} />
          <div style={{ width: 84, height: 84, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <svg viewBox="0 0 16 16" width={64} height={64} fill={T.fg}><path d={LOGO_PATH} /></svg>
          </div>
        </div>
        <div style={{ opacity: textOpacity, transform: `translateY(${textY}px)`, marginTop: 22 }}>
          <div style={{ fontSize: 52, fontWeight: 700, color: T.fg, letterSpacing: "-0.03em" }}>PocketWatch</div>
        </div>
        <div style={{ opacity: tagOpacity, transform: `translateY(${tagY}px)`, marginTop: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 400, color: T.fgSecondary }}>Your entire financial life, unified.</div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};
