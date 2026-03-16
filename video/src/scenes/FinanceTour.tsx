/**
 * Scene 3: Finance tour. 42s (1260 frames).
 * Order: Dashboard, Insights, Budgets, Investments, Cards Overview, Card Strategy.
 * Varied transitions and scroll speeds per page.
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
  // ── Finance Dashboard (7s = 210 frames) ──
  {
    start: 40,
    duration: 210,
    config: {
      src: SCREENS.financeDashboard.file,
      imageHeight: SCREENS.financeDashboard.h,
      enter: "fade",
      scrollTo: 580,
      scrollDelay: 60,
      scrollDuration: 130,
      captions: [
        { at: 15, text: "Real-time net worth with automatic bank and brokerage sync" },
        { at: 110, text: "Transactions auto-categorized with monthly spending breakdown" },
      ],
    },
  },

  // ── Finance Insights (14s = 420 frames) ──
  {
    start: 240,
    duration: 420,
    config: {
      src: SCREENS.financeInsights.file,
      imageHeight: SCREENS.financeInsights.h,
      enter: "slide-left",
      scrollTo: 3400,
      scrollDelay: 50,
      scrollDuration: 380,
      captions: [
        { at: 15, text: "Financial health score across savings, debt, spending, and income" },
        { at: 140, text: "Monthly income vs. expenses with savings rate trend over time" },
        { at: 270, text: "AI-generated insights flag anomalies and suggest ways to save" },
      ],
    },
  },

  // ── Finance Budgets (4.7s = 140 frames) ──
  {
    start: 650,
    duration: 140,
    config: {
      src: SCREENS.financeBudgets.file,
      imageHeight: SCREENS.financeBudgets.h,
      enter: "scale",
      scrollTo: 600,
      scrollDelay: 35,
      scrollDuration: 90,
      captions: [
        { at: 15, text: "Monthly budgets per category with color-coded progress bars" },
      ],
    },
  },

  // ── Finance Investments (3.7s = 110 frames) ──
  {
    start: 780,
    duration: 110,
    config: {
      src: SCREENS.financeInvestments.file,
      imageHeight: SCREENS.financeInvestments.h,
      enter: "slide-right",
      captions: [
        { at: 15, text: "Stock and ETF portfolio with real-time gain/loss per position" },
      ],
    },
  },

  // ── Cards & Bills Overview (5s = 150 frames) ──
  {
    start: 880,
    duration: 150,
    config: {
      src: SCREENS.financeCards.file,
      imageHeight: SCREENS.financeCards.h,
      enter: "slide-left",
      scrollTo: 674,
      scrollDelay: 30,
      scrollDuration: 120,
      captions: [
        { at: 15, text: "Bill calendar with due dates and credit utilization tracking" },
      ],
    },
  },

  // ── Card Strategy (8s = 240 frames) ──
  {
    start: 1020,
    duration: 240,
    config: {
      src: SCREENS.financeCardStrategy.file,
      imageHeight: SCREENS.financeCardStrategy.h,
      enter: "scale",
      scrollTo: 1300,
      scrollDelay: 25,
      scrollDuration: 210,
      captions: [
        { at: 12, text: "You're leaving $21.70/mo on the table in missed rewards" },
        { at: 75, text: "Wallet strategy picks the best card for every spending category" },
        { at: 140, text: "Perks tracker with credits redeemed and ROI per card" },
      ],
    },
  },
];

export const FinanceTour: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <SceneFade fadeIn={1} fadeOut={4}>
      <AbsoluteFill>
        {frame < 40 && <SectionTitle label="Traditional Finance" title="Every account, every dollar" />}

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
