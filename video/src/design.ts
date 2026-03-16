/**
 * Design tokens + scene timing for PocketWatch showcase video.
 */

export const T = {
  bg: "#F5F5F7",
  bgSecondary: "#FFFFFF",
  fg: "#1D1D1F",
  fgMuted: "#6E6E73",
  fgSecondary: "#86868B",
  primary: "#0A84FF",
  primaryMuted: "rgba(10,132,255,0.08)",
  card: "#FFFFFF",
  cardBorder: "#E5E5EA",
  success: "#34C759",
  successMuted: "rgba(52,199,89,0.08)",
  error: "#FF3B30",
  warning: "#FF9500",
  glass: "rgba(255,255,255,0.92)",
  glassBorder: "rgba(0,0,0,0.06)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
} as const;

export const FPS = 30;
export const TOTAL_FRAMES = 2070;

export const SCENES = {
  intro:          { from: 0,    duration: 90 },     // 3s
  hook:           { from: 90,   duration: 60 },     // 2s
  financeTour:    { from: 150,  duration: 1260 },   // 42s
  portfolioTour:  { from: 1410, duration: 420 },    // 14s
  netWorth:       { from: 1830, duration: 120 },    // 4s
  outro:          { from: 1950, duration: 120 },    // 4s
} as const;

export const SCREENS = {
  netWorth:              { file: "screens/net-worth.png",                  h: 1080 },
  financeDashboard:      { file: "screens/finance-dashboard-full.png",     h: 1661 },
  financeInsights:       { file: "screens/finance-insights-full.png",      h: 4987 },
  financeBudgets:        { file: "screens/finance-budgets-full.png",       h: 1682 },
  financeInvestments:    { file: "screens/finance-investments-full.png",   h: 2587 },
  financeCards:          { file: "screens/finance-cards-full.png",         h: 1754 },
  financeCardStrategy:   { file: "screens/finance-cards-strategy-full.png", h: 2382 },
  portfolioOverview:     { file: "screens/portfolio-overview-full.png",    h: 2102 },
  portfolioStaking:      { file: "screens/portfolio-staking-full.png",     h: 2883 },
} as const;

export const LOGO_PATH = "M3 2.5A1.5 1.5 0 0 1 4.5 1h1A1.5 1.5 0 0 1 7 2.5V5h2V2.5A1.5 1.5 0 0 1 10.5 1h1A1.5 1.5 0 0 1 13 2.5v2.382a.5.5 0 0 0 .276.447l.895.447A1.5 1.5 0 0 1 15 7.118V14.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 14.5v-3a.5.5 0 0 1 .146-.354l.854-.853V9.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v.793l.854.853A.5.5 0 0 1 7 11.5v3A1.5 1.5 0 0 1 5.5 16h-3A1.5 1.5 0 0 1 1 14.5V7.118a1.5 1.5 0 0 1 .83-1.342l.894-.447A.5.5 0 0 0 3 4.882zM4.5 2a.5.5 0 0 0-.5.5V3h2v-.5a.5.5 0 0 0-.5-.5zM6 4H4v.882a1.5 1.5 0 0 1-.83 1.342l-.894.447A.5.5 0 0 0 2 7.118V13h4v-1.293l-.854-.853A.5.5 0 0 1 5 10.5v-1A1.5 1.5 0 0 1 6.5 8h3A1.5 1.5 0 0 1 11 9.5v1a.5.5 0 0 1-.146.354l-.854.853V13h4V7.118a.5.5 0 0 0-.276-.447l-.895-.447A1.5 1.5 0 0 1 12 4.882V4h-2v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5zm4-1h2v-.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5zm4 11h-4v.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5zm-8 0H2v.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5z";
