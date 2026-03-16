import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod/v4"
import { getPeriodBoundaries, getDaysRemaining, shouldResetPerk, computeAnnualizedValue, periodLabel } from "@/lib/finance/perk-periods"
import type { PerkPeriod, CardPerkFull } from "@/types/card-perks"

function enrichPerk(perk: {
  id: string; cardProfileId: string; name: string; value: number; maxValue: number; usedValue: number
  perkType: string; period: string; periodResetDay: number; currentPeriodStart: Date | null
  description: string | null; isUsed: boolean; usedDate: Date | null
}): CardPerkFull {
  const p = perk.period as PerkPeriod
  const bounds = perk.perkType === "limited" ? getPeriodBoundaries(p, perk.periodResetDay) : null
  const max = perk.maxValue > 0 ? perk.maxValue : perk.value
  return {
    id: perk.id, cardProfileId: perk.cardProfileId, name: perk.name, value: perk.value,
    maxValue: max, usedValue: perk.usedValue, perkType: perk.perkType as "limited" | "unlimited",
    period: p, periodResetDay: perk.periodResetDay,
    currentPeriodStart: perk.currentPeriodStart?.toISOString() ?? null,
    description: perk.description, isUsed: perk.isUsed,
    usedDate: perk.usedDate?.toISOString() ?? null,
    percentUsed: max > 0 ? Math.min(100, Math.round((perk.usedValue / max) * 100)) : 0,
    daysRemaining: bounds ? getDaysRemaining(bounds.end) : null,
    periodEnd: bounds?.end.toISOString() ?? null,
    periodLabel: periodLabel(p),
    annualizedValue: computeAnnualizedValue(max, p),
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("F6010", "Authentication required", 401)

  const cardId = new URL(req.url).searchParams.get("cardId")
  if (!cardId) return apiError("F6011", "cardId required", 400)

  try {
    const card = await db.creditCardProfile.findFirst({ where: { id: cardId, userId: user.id } })
    if (!card) return apiError("F6012", "Card not found", 404)

    const perks = await db.creditCardPerk.findMany({
      where: { cardProfileId: cardId },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    // Auto-reset perks whose period has elapsed
    const now = new Date()
    const resets: Array<{ id: string; periodStart: Date }> = []
    for (const perk of perks) {
      if (perk.perkType === "limited" && shouldResetPerk(perk)) {
        const { start } = getPeriodBoundaries(perk.period as PerkPeriod, perk.periodResetDay)
        resets.push({ id: perk.id, periodStart: start })
      }
    }
    // Update each reset perk with its correct period start (not `now`)
    for (const { id, periodStart } of resets) {
      await db.creditCardPerk.update({
        where: { id },
        data: { usedValue: 0, isUsed: false, currentPeriodStart: periodStart },
      })
    }

    // Build immutable result with reset applied
    const resetMap = new Map(resets.map((r) => [r.id, r.periodStart]))
    const result = perks.map((perk) => {
      const periodStart = resetMap.get(perk.id)
      return periodStart
        ? enrichPerk({ ...perk, usedValue: 0, isUsed: false, currentPeriodStart: periodStart })
        : enrichPerk(perk)
    })

    return NextResponse.json(result)
  } catch (err) {
    return apiError("F6013", "Failed to fetch perks", 500, err)
  }
}

const createSchema = z.object({
  cardProfileId: z.string().min(1),
  name: z.string().min(1).max(200),
  value: z.number().min(0).default(0),
  maxValue: z.number().min(0).optional(),
  perkType: z.enum(["limited", "unlimited"]).optional(),
  period: z.enum(["monthly", "quarterly", "annual", "one_time"]).optional(),
  periodResetDay: z.number().min(1).max(28).optional(),
  description: z.string().max(500).optional(),
  isUsed: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("F6020", "Authentication required", 401)

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return apiError("F6021", parsed.error.issues[0]?.message ?? "Invalid", 400)

  try {
    const card = await db.creditCardProfile.findFirst({ where: { id: parsed.data.cardProfileId, userId: user.id } })
    if (!card) return apiError("F6022", "Card not found", 404)

    const p = (parsed.data.period ?? "annual") as PerkPeriod
    const bounds = getPeriodBoundaries(p, parsed.data.periodResetDay ?? 1)
    const perk = await db.creditCardPerk.create({
      data: {
        cardProfileId: parsed.data.cardProfileId,
        name: parsed.data.name,
        value: parsed.data.value,
        maxValue: parsed.data.maxValue ?? parsed.data.value,
        perkType: parsed.data.perkType ?? (parsed.data.value > 0 ? "limited" : "unlimited"),
        period: p,
        periodResetDay: parsed.data.periodResetDay ?? 1,
        currentPeriodStart: bounds.start,
        description: parsed.data.description ?? null,
        isUsed: parsed.data.isUsed ?? false,
      },
    })
    return NextResponse.json(enrichPerk(perk), { status: 201 })
  } catch (err) {
    return apiError("F6023", "Failed to create perk", 500, err)
  }
}

const patchSchema = z.object({
  perkId: z.string().min(1),
  addAmount: z.number().min(0.01).optional(),
  setUsedValue: z.number().min(0).optional(),
  isUsed: z.boolean().optional(),
  note: z.string().max(200).optional(),
})

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("F6030", "Authentication required", 401)

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError("F6031", "Invalid request", 400)

  try {
    const perk = await db.creditCardPerk.findFirst({
      where: { id: parsed.data.perkId },
      include: { cardProfile: { select: { userId: true } } },
    })
    if (!perk || perk.cardProfile.userId !== user.id) return apiError("F6032", "Perk not found", 404)

    const max = perk.maxValue > 0 ? perk.maxValue : perk.value
    let newUsed = perk.usedValue
    if (parsed.data.addAmount !== undefined) {
      newUsed = Math.min(max, perk.usedValue + parsed.data.addAmount)
      await db.perkUsageLog.create({
        data: { perkId: perk.id, amount: parsed.data.addAmount, note: parsed.data.note ?? null },
      })
    } else if (parsed.data.setUsedValue !== undefined) {
      newUsed = Math.min(max, parsed.data.setUsedValue)
    } else if (parsed.data.isUsed === true) {
      newUsed = max // legacy toggle: mark fully used
    } else if (parsed.data.isUsed === false) {
      newUsed = 0
    }

    const updated = await db.creditCardPerk.update({
      where: { id: perk.id },
      data: { usedValue: newUsed, isUsed: newUsed >= max, usedDate: newUsed > 0 ? new Date() : null },
    })
    return NextResponse.json(enrichPerk(updated))
  } catch (err) {
    return apiError("F6033", "Failed to update perk", 500, err)
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("F6040", "Authentication required", 401)

  const perkId = new URL(req.url).searchParams.get("perkId")
  if (!perkId) return apiError("F6041", "perkId required", 400)

  try {
    const perk = await db.creditCardPerk.findFirst({
      where: { id: perkId },
      include: { cardProfile: { select: { userId: true } } },
    })
    if (!perk || perk.cardProfile.userId !== user.id) return apiError("F6042", "Perk not found", 404)

    await db.creditCardPerk.delete({ where: { id: perkId } })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    return apiError("F6043", "Failed to delete perk", 500, err)
  }
}
