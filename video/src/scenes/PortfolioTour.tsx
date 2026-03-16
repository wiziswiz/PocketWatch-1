/**
 * Scene 4: Portfolio tour. 14s (420 frames).
 * Overview and Staking with multiple captions and varied transitions.
 */

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SCREENS } from "../design";
import { SceneFade, PageDisplay, SectionTitle, PageConfig } from "../components";

interface PageSlot {
  config: PageConfig;
  start: number;
  duration: number;
}

const PAGES: PageSlot[] = [
  // ── Portfolio Overview (7.7s = 230 frames) ──
  {
    start: 40,
    duration: 230,
    config: {
      src: SCREENS.portfolioOverview.file,
      imageHeight: SCREENS.portfolioOverview.h,
      enter: "slide-right",
      scrollTo: 1020,
      scrollDelay: 45,
      scrollDuration: 170,
      captions: [
        { at: 15, text: "Live portfolio value across 26 chains with interactive price charting" },
        { at: 120, text: "Every token ranked by value with holdings and daily performance" },
      ],
    },
  },

  // ── Portfolio Staking (5.7s = 170 frames, no scroll) ──
  {
    start: 260,
    duration: 170,
    config: {
      src: SCREENS.portfolioStaking.file,
      imageHeight: SCREENS.portfolioStaking.h,
      enter: "fade",
      captions: [
        { at: 15, text: "Track staking and DeFi positions with yield earned, live APY, and estimated annual returns" },
      ],
    },
  },
];

export const PortfolioTour: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <SceneFade fadeIn={1} fadeOut={4}>
      <AbsoluteFill>
        {frame < 40 && <SectionTitle label="Digital Assets" title="Multi-chain portfolio tracking" color="#627eea" />}

        {PAGES.map((page, i) => {
          const localFrame = frame - page.start;
          if (localFrame < -2 || localFrame > page.duration + 2) return null;
          return (
            <PageDisplay
              key={i}
              config={page.config}
              localFrame={Math.max(0, localFrame)}
              duration={page.duration}
            />
          );
        })}
      </AbsoluteFill>
    </SceneFade>
  );
};
