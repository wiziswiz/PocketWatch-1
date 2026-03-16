/**
 * Scene 2: Hook text — 2s (60 frames)
 */

import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { T } from "../design";
import { SceneFade } from "../components";

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [3, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(frame, [3, 18], [0.96, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const subOpacity = interpolate(frame, [18, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <SceneFade fadeIn={1} fadeOut={8}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ opacity, transform: `scale(${scale})`, textAlign: "center" }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: T.fg, letterSpacing: "-0.02em", lineHeight: 1.3, maxWidth: 850 }}>
            Banks, Tradfi, Crypto & Budgets
          </div>
        </div>
        <div style={{ opacity: subOpacity, marginTop: 14 }}>
          <div style={{ fontSize: 19, color: T.primary, fontWeight: 600 }}>All in one self-hosted dashboard</div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};
