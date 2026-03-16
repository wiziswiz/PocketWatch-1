/**
 * Main composition — real screenshots with phase-based zoom/scroll.
 * 69 seconds at 30fps = 2070 frames.
 */

import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { SCENES } from "./design";
import { Background } from "./components";
import { Intro } from "./scenes/Intro";
import { Hook } from "./scenes/Hook";
import { FinanceTour } from "./scenes/FinanceTour";
import { PortfolioTour } from "./scenes/PortfolioTour";
import { NetWorthReveal } from "./scenes/NetWorthReveal";

import { Outro } from "./scenes/Outro";

const { fontFamily } = loadFont();

export const PocketWatch: React.FC = () => (
  <AbsoluteFill style={{ fontFamily, WebkitFontSmoothing: "antialiased" }}>
    <Background />
    <Audio src={staticFile("digital-clouds.mp3")} volume={0.5} />

    <Sequence from={SCENES.intro.from} durationInFrames={SCENES.intro.duration}>
      <Intro />
    </Sequence>

    <Sequence from={SCENES.hook.from} durationInFrames={SCENES.hook.duration}>
      <Hook />
    </Sequence>

    <Sequence from={SCENES.financeTour.from} durationInFrames={SCENES.financeTour.duration}>
      <FinanceTour />
    </Sequence>

    <Sequence from={SCENES.portfolioTour.from} durationInFrames={SCENES.portfolioTour.duration}>
      <PortfolioTour />
    </Sequence>

    <Sequence from={SCENES.netWorth.from} durationInFrames={SCENES.netWorth.duration}>
      <NetWorthReveal />
    </Sequence>

    <Sequence from={SCENES.outro.from} durationInFrames={SCENES.outro.duration}>
      <Outro />
    </Sequence>
  </AbsoluteFill>
);
