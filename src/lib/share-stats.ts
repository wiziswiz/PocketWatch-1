/** Shareable stats encoding/decoding for public share cards. */

export interface ShareableStats {
  g: string    // health grade (A+, A, B, etc.)
  s: number    // health score (0-100)
  br: number   // daily burn rate ($)
  bp: number   // biggest single purchase ($)
  sc: number   // active subscription count
  gn: boolean  // gooner detected (OnlyFans charges found)
  tm: string   // top merchant name (most visited)
  tc: number   // top merchant visit count
  sv: number   // savings found (annual $, from unwanted subs + budget overages)
  ac: number   // connected account/source count
}

const GOONER_PATTERNS = [
  "onlyfans", "only fans", "fenix international", "of.com",
]

/** Check merchant lists for OnlyFans-related charges. */
export function detectGooner(
  frequentMerchants: Array<{ name: string }>,
  topCategories: Array<{ topMerchants: Array<{ name: string }> }>,
  largestPurchases: Array<{ name: string }>,
): boolean {
  const allNames = [
    ...frequentMerchants.map((m) => m.name),
    ...topCategories.flatMap((c) => c.topMerchants.map((m) => m.name)),
    ...largestPurchases.map((p) => p.name),
  ]
  return allNames.some((name) => {
    const lower = name.toLowerCase()
    return GOONER_PATTERNS.some((p) => lower.includes(p))
  })
}

/** Calculate annual savings PocketWatch identified (unwanted subs + budget overages + missed card rewards). */
export function calcSavingsFound(
  subscriptionSummary: { potentialSavings?: number } | null,
  budgetHealth: Array<{ projectedOverage?: number }> | null,
  cardRewardsGap: number,
): number {
  const monthlySubs = subscriptionSummary?.potentialSavings ?? 0
  // Only count top 3 budget overages (sorted by size), capped at $200 each
  // to avoid auto-budget inflation across many categories
  const overages = (budgetHealth ?? [])
    .map((b) => Math.min(200, Math.max(0, b.projectedOverage ?? 0)))
    .filter((v) => v > 0)
    .sort((a, b) => b - a)
    .slice(0, 3)
  const monthlyOverage = overages.reduce((s, v) => s + v, 0)
  const monthlyCardGap = Math.min(100, Math.max(0, cardRewardsGap))
  return Math.round((monthlySubs + monthlyOverage + monthlyCardGap) * 12)
}

export function encodeShareStats(stats: ShareableStats): string {
  return btoa(JSON.stringify(stats))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export function decodeShareStats(code: string): ShareableStats | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(b64))
  } catch {
    return null
  }
}

/** The standardized receipt line items for display. */
export interface ReceiptLine {
  label: string
  value: string
  accent?: string // only used for 1-2 status indicators, most lines are white
}

const SCORE_COLORS: Record<string, string> = {
  green: "#16a34a",
  yellow: "#ca8a04",
  red: "#dc2626",
}

function scoreAccent(score: number): string {
  if (score >= 80) return SCORE_COLORS.green
  if (score >= 60) return SCORE_COLORS.yellow
  return SCORE_COLORS.red
}

export function buildReceiptLines(stats: ShareableStats): ReceiptLine[] {
  return [
    {
      label: "Sources Connected",
      value: `${stats.ac} account${stats.ac !== 1 ? "s" : ""}`,
    },
    {
      label: "Financial Health Score",
      value: `${stats.g} (${stats.s}/100)`,
      accent: scoreAccent(stats.s),
    },
    {
      label: "OnlyFans Subscriber",
      value: stats.gn ? "POSITIVE" : "NEGATIVE",
      accent: stats.gn ? SCORE_COLORS.red : SCORE_COLORS.green,
    },
    {
      label: "#1 Habit",
      value: stats.tm ? `${stats.tm} (${stats.tc}x)` : "N/A",
    },
    {
      label: "Savings Found",
      value: stats.sv > 0 ? `$${stats.sv.toLocaleString()}/yr` : "$0/yr",
    },
    {
      label: "Biggest Purchase",
      value: stats.bp > 0 ? `$${stats.bp.toLocaleString()}` : "N/A",
    },
    {
      label: "Subscriptions",
      value: `${stats.sc} active`,
    },
    {
      label: "Daily Burn Rate",
      value: stats.br > 0 ? `$${stats.br.toLocaleString()}/day` : "N/A",
    },
  ]
}
