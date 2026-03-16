/**
 * Shared components for PocketWatch showcase video.
 * Clean, premium motion. Multiple timed captions per page.
 */

import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  Easing,
} from "remotion";
import { T } from "./design";

// ─── Types ───

export interface Caption {
  text: string;
  at: number;       // frame when it appears
  until?: number;   // frame when it disappears (defaults to next caption's `at`)
}

export interface PageConfig {
  src: string;
  imageHeight: number;
  scrollTo?: number;
  scrollDelay?: number;
  scrollDuration?: number;
  captions: Caption[];
  enter?: "fade" | "slide-right" | "slide-left" | "scale";
}

// ─── Background ───

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: T.bg }}>
      <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${T.primaryMuted} 0%, transparent 70%)`, top: `${30 + Math.sin(frame * 0.002) * 2}%`, left: `${20 + Math.cos(frame * 0.0015) * 1.5}%`, transform: "translate(-50%, -50%)", filter: "blur(100px)", opacity: 0.4 }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(48,209,88,0.05) 0%, transparent 70%)", top: `${65 + Math.sin(frame * 0.003 + 2) * 2}%`, left: `${72 + Math.cos(frame * 0.002 + 1) * 1.5}%`, transform: "translate(-50%, -50%)", filter: "blur(100px)", opacity: 0.3 }} />
    </AbsoluteFill>
  );
};

// ─── Scene fade ───

export const SceneFade: React.FC<{
  children: React.ReactNode;
  fadeIn?: number;
  fadeOut?: number;
}> = ({ children, fadeIn = 10, fadeOut = 8 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fi = Math.max(fadeIn, 1);
  const fadeOutStart = Math.max(durationInFrames - Math.max(fadeOut, 1), fi + 1);
  const opacity = interpolate(frame, [0, fi, fadeOutStart, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

// ─── Simple fade-in wrapper ───

export const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, duration = 18, style }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return <div style={{ opacity: progress, ...style }}>{children}</div>;
};

// ─── Spring element ───

export const SpringIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.8, stiffness: 180 } });
  const opacity = interpolate(frame - delay, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ opacity, transform: `scale(${scale})`, ...style }}>{children}</div>;
};

// ─── Resolve active caption from array ───

function resolveCaption(localFrame: number, captions: Caption[], duration: number): { text: string; opacity: number } | null {
  if (captions.length === 0) return null;

  // Find which caption is active
  let active: Caption | null = null;
  let nextAt = duration;

  for (let i = captions.length - 1; i >= 0; i--) {
    if (localFrame >= captions[i].at) {
      active = captions[i];
      nextAt = captions[i + 1]?.at ?? (captions[i].until ?? duration);
      break;
    }
  }

  if (!active) return null;

  const fadeInStart = active.at;
  const fadeInEnd = active.at + 24;
  const fadeOutStart = nextAt - 20;
  const fadeOutEnd = nextAt;

  const fadeIn = interpolate(localFrame, [fadeInStart, fadeInEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(localFrame, [fadeOutStart, fadeOutEnd], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return { text: active.text, opacity: Math.min(fadeIn, fadeOut) };
}

// ─── Page display with entry animation, scroll, and timed captions ───

export const PageDisplay: React.FC<{
  config: PageConfig;
  localFrame: number;
  duration: number;
}> = ({ config, localFrame, duration }) => {
  const enterStyle = config.enter ?? "fade";

  // Entry (first 20 frames)
  const enterProgress = interpolate(localFrame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Exit (last 15 frames)
  const exitProgress = interpolate(localFrame, [duration - 15, duration], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const opacity = enterProgress * exitProgress;

  // Entry transform
  let transform = "";
  switch (enterStyle) {
    case "slide-right":
      transform = `translateX(${(1 - enterProgress) * 60}px)`;
      break;
    case "slide-left":
      transform = `translateX(${-(1 - enterProgress) * 60}px)`;
      break;
    case "scale":
      transform = `scale(${0.97 + enterProgress * 0.03})`;
      break;
    default:
      transform = "";
  }

  // Smooth scroll
  let scrollY = 0;
  if (config.scrollTo && config.scrollDuration) {
    const delay = config.scrollDelay ?? 30;
    const maxScroll = Math.min(config.scrollTo, Math.max(0, config.imageHeight - 1080));
    scrollY = interpolate(
      localFrame - delay,
      [0, config.scrollDuration],
      [0, maxScroll],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
    );
  }

  // Caption
  const caption = resolveCaption(localFrame, config.captions, duration);

  return (
    <AbsoluteFill style={{ opacity, transform }}>
      {/* Screenshot */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 1920, height: 1080, overflow: "hidden", borderRadius: 8, boxShadow: "0 12px 60px rgba(0,0,0,0.5)" }}>
          <Img
            src={staticFile(config.src)}
            style={{
              width: 1920,
              height: "auto",
              display: "block",
              transform: `translateY(${-scrollY}px)`,
            }}
          />
        </div>
      </AbsoluteFill>

      {/* Caption */}
      {caption && caption.opacity > 0 && (
        <div style={{
          position: "absolute",
          bottom: 44,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: caption.opacity,
          transform: `translateY(${(1 - caption.opacity) * 6}px)`,
          zIndex: 10,
        }}>
          <div style={{
            background: "rgba(0,0,0,0.82)",
            borderRadius: 10,
            padding: "14px 32px",
            maxWidth: 900,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}>
            <span style={{ fontSize: 24, fontWeight: 500, color: "#F5F5F7" }}>
              {caption.text}
            </span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Section title ───

export const SectionTitle: React.FC<{
  label: string;
  title: string;
  color?: string;
}> = ({ label, title, color = T.primary }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 25, 36], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 12], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity }}>
      <div style={{ textAlign: "center", transform: `translateY(${y}px)` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: T.fg, letterSpacing: "-0.02em" }}>{title}</div>
      </div>
    </AbsoluteFill>
  );
};
