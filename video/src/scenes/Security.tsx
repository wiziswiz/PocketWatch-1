/**
 * Scene 6: Security — 4s (120 frames)
 */

import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { T } from "../design";
import { SceneFade, SpringIn } from "../components";

const FEATURES = [
  { title: "End-to-End Encrypted", desc: "Per-user AES keys wrap all data", color: T.primary },
  { title: "Self-Hosted", desc: "Your hardware, your control", color: T.success },
  { title: "Open Source", desc: "Every line auditable", color: "#AF52DE" },
  { title: "Read-Only", desc: "No private keys, ever", color: T.warning },
];

export const Security: React.FC = () => {
  const frame = useCurrentFrame();
  const headerOpacity = interpolate(frame, [3, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headerScale = interpolate(frame, [3, 15], [0.96, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <SceneFade fadeIn={1} fadeOut={8}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 120px" }}>
        <div style={{ opacity: headerOpacity, transform: `scale(${headerScale})`, textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.primary, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Privacy First</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: T.fg, letterSpacing: "-0.02em" }}>Your data stays yours</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, maxWidth: 800, width: "100%" }}>
          {FEATURES.map((f, i) => (
            <SpringIn key={f.title} delay={20 + i * 12}>
              <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: T.radius.lg, padding: "22px 24px", boxShadow: T.shadowMd }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: f.color, marginBottom: 12, boxShadow: `0 0 10px ${f.color}60` }} />
                <div style={{ fontSize: 18, fontWeight: 600, color: T.fg, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: T.fgSecondary }}>{f.desc}</div>
              </div>
            </SpringIn>
          ))}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};
