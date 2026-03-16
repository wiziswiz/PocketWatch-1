/**
 * Perk type and period classification helpers used by apply-enrichment.
 */

import type { PerkPeriod } from "@/types/card-perks"

const UNLIMITED_KEYWORDS = [
  "protection", "insurance", "warranty", "roadside", "concierge", "lounge",
  "global entry", "tsa", "precheck", "clear", "wifi", "shipping", "access",
  "membership", "priority pass", "dispatch", "medical", "dental", "evacuation",
  "reimbursement", "collision", "rental", "trip delay", "baggage", "cancellation",
  "purchase protection", "return protection", "lost luggage",
]

/** Classify whether a perk is limited (trackable credit) or unlimited (always-active benefit). */
export function classifyPerkType(name: string, value: number, aiType?: string): "limited" | "unlimited" {
  if (aiType === "limited" || aiType === "unlimited") return aiType
  if (value > 0) {
    const lower = name.toLowerCase()
    if (UNLIMITED_KEYWORDS.some((kw) => lower.includes(kw))) return "unlimited"
    return "limited"
  }
  return "unlimited"
}

/** Detect the billing period from the perk name or AI response. */
export function detectPeriod(name: string, aiPeriod?: string): PerkPeriod {
  if (aiPeriod === "monthly" || aiPeriod === "quarterly" || aiPeriod === "annual" || aiPeriod === "one_time") {
    return aiPeriod
  }
  const lower = name.toLowerCase()
  if (/\bmonth(ly)?\b/.test(lower)) return "monthly"
  if (/\bquarter(ly)?\b/.test(lower)) return "quarterly"
  return "annual"
}
