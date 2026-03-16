/**
 * Scene 5: Net Worth reveal. 4s (120 frames).
 * Shows the unified net worth dashboard.
 */

import React from "react";
import { SCREENS } from "../design";
import { SceneFade, PageDisplay, PageConfig } from "../components";
import { useCurrentFrame } from "remotion";

const CONFIG: PageConfig = {
  src: SCREENS.netWorth.file,
  imageHeight: SCREENS.netWorth.h,
  enter: "fade",
  captions: [
    { at: 10, text: "Traditional finance and digital assets unified into one net worth view" },
  ],
};

export const NetWorthReveal: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <SceneFade fadeIn={8} fadeOut={8}>
      <PageDisplay
        config={CONFIG}
        localFrame={frame}
        duration={120}
      />
    </SceneFade>
  );
};
