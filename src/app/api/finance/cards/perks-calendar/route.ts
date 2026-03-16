import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { getPeriodBoundaries, generateICS } from "@/lib/finance/perk-periods"
import type { PerkPeriod } from "@/types/card-perks"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiError("F6100", "Authentication required", 401)

  try {
    const perks = await db.creditCardPerk.findMany({
      where: {
        cardProfile: { userId: user.id },
        perkType: "limited",
        maxValue: { gt: 0 },
      },
      include: { cardProfile: { select: { cardName: true } } },
    })

    const entries = perks.map((p) => {
      const bounds = getPeriodBoundaries(p.period as PerkPeriod, p.periodResetDay)
      return {
        name: p.name,
        cardName: p.cardProfile.cardName,
        periodEnd: bounds.end,
        maxValue: p.maxValue,
        usedValue: p.usedValue,
      }
    }).filter((e) => e.maxValue - e.usedValue > 0)

    const ics = generateICS(entries)
    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=pocketwatch-perks.ics",
      },
    })
  } catch (err) {
    return apiError("F6101", "Failed to generate calendar", 500, err)
  }
}
