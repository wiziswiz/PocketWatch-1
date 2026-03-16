/**
 * Period boundary calculations, reset detection, and iCal generation for credit card perks.
 */

import type { PerkPeriod } from "@/types/card-perks"

export interface PeriodBoundaries {
  start: Date
  end: Date
}

/** Get the current period boundaries for a perk. */
export function getPeriodBoundaries(
  period: PerkPeriod,
  resetDay: number,
  referenceDate: Date = new Date()
): PeriodBoundaries {
  const day = Math.min(resetDay, 28)
  const ref = new Date(referenceDate)

  if (period === "monthly") {
    const start = new Date(ref.getFullYear(), ref.getMonth(), day)
    if (start > ref) start.setMonth(start.getMonth() - 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, day)
    return { start, end }
  }

  if (period === "quarterly") {
    const quarterMonth = Math.floor(ref.getMonth() / 3) * 3
    const start = new Date(ref.getFullYear(), quarterMonth, day)
    if (start > ref) start.setMonth(start.getMonth() - 3)
    const end = new Date(start.getFullYear(), start.getMonth() + 3, day)
    return { start, end }
  }

  if (period === "annual") {
    const start = new Date(ref.getFullYear(), 0, day)
    if (start > ref) start.setFullYear(start.getFullYear() - 1)
    const end = new Date(start.getFullYear() + 1, 0, day)
    return { start, end }
  }

  // one_time — no reset, use far-future end
  return {
    start: new Date(2020, 0, 1),
    end: new Date(2099, 11, 31),
  }
}

/** Days remaining until the period ends. */
export function getDaysRemaining(periodEnd: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / 86_400_000))
}

/** Check if the perk's current period has passed and needs a reset. */
export function shouldResetPerk(perk: {
  currentPeriodStart: Date | null
  period: string
  periodResetDay: number
}): boolean {
  if (perk.period === "one_time") return false
  if (!perk.currentPeriodStart) return true
  const { start } = getPeriodBoundaries(perk.period as PerkPeriod, perk.periodResetDay)
  return start.getTime() > perk.currentPeriodStart.getTime()
}

/** Convert a perk's per-period value to an annual total. */
export function computeAnnualizedValue(maxValue: number, period: PerkPeriod): number {
  switch (period) {
    case "monthly": return maxValue * 12
    case "quarterly": return maxValue * 4
    case "annual": return maxValue
    case "one_time": return maxValue
  }
}

/** Compute ROI: annualized perks used / annual fee. */
export function computeROI(annualFee: number, annualizedPerksUsed: number): number {
  if (annualFee <= 0) return 0
  return Math.round((annualizedPerksUsed / annualFee) * 100)
}

/** Human-readable period label. */
export function periodLabel(period: PerkPeriod): string {
  switch (period) {
    case "monthly": return "Monthly"
    case "quarterly": return "Quarterly"
    case "annual": return "Annual"
    case "one_time": return "One-time"
  }
}

/** Generate an iCal (.ics) file for perk deadlines. */
export function generateICS(
  perks: Array<{ name: string; cardName: string; periodEnd: Date; maxValue: number; usedValue: number; id?: string }>
): string {
  const now = new Date()
  const stamp = formatICSDate(now)

  const events = perks.map((p) => {
    const remaining = p.maxValue - p.usedValue
    const summary = `${p.cardName}: Use ${p.name} ($${remaining.toFixed(0)} remaining)`
    // Event is on the deadline day; alarm fires 3 days before
    const dtStart = formatICSDate(p.periodEnd)
    const dtEndDate = new Date(p.periodEnd.getTime() + 86_400_000) // +1 day for all-day event
    const dtEnd = formatICSDate(dtEndDate)
    // Stable UID based on perk identity, not generation time
    const uid = slugify(`${p.cardName}-${p.name}`)
    return [
      "BEGIN:VEVENT",
      `UID:pocketwatch-${uid}@pocketwatch`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dtStart.slice(0, 8)}`,
      `DTEND;VALUE=DATE:${dtEnd.slice(0, 8)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:Use your ${p.name} perk on ${p.cardName} before it resets.`,
      "BEGIN:VALARM",
      "TRIGGER:-P3D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${summary}`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n")
  })

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PocketWatch//Perk Reminders//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n")
}

function formatICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}
