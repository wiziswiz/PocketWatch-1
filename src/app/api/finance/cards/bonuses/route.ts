import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"

// GET — fetch all bonus trackers for the user
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiError("B1001", "Authentication required", 401)

  try {
    const trackers = await db.signUpBonusTracker.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })

    const now = new Date()
    const enriched = trackers.map((t) => {
      const daysTotal = Math.ceil(
        (t.spendDeadline.getTime() - t.startDate.getTime()) / (1000 * 60 * 60 * 24),
      )
      const daysLeft = Math.max(
        0,
        Math.ceil((t.spendDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      )
      const progress = t.spendRequired > 0 ? Math.min(1, t.currentSpend / t.spendRequired) : 1
      const remaining = Math.max(0, t.spendRequired - t.currentSpend)
      const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : 0
      const isExpired = daysLeft === 0 && !t.isCompleted

      return {
        ...t,
        daysTotal,
        daysLeft,
        progress,
        remaining,
        dailyNeeded: Math.round(dailyNeeded * 100) / 100,
        isExpired,
      }
    })

    return NextResponse.json(enriched)
  } catch (error) {
    return apiError("B1002", "Failed to fetch bonus trackers", 500, error)
  }
}

// POST — create a new bonus tracker
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return apiError("B1003", "Authentication required", 401)

  try {
    const body = await request.json()
    const {
      cardName,
      issuer,
      currency,
      bonusAmount,
      spendRequired,
      daysToComplete,
      startDate,
      annualFee,
      isAnnualFeeWaived,
      externalCardId,
      cardProfileId,
      notes,
    } = body

    if (!cardName || !bonusAmount || !spendRequired || !daysToComplete) {
      return apiError("B1004", "Missing required fields", 400)
    }

    const start = startDate ? new Date(startDate) : new Date()
    const deadline = new Date(start)
    deadline.setDate(deadline.getDate() + daysToComplete)

    const tracker = await db.signUpBonusTracker.create({
      data: {
        userId: user.id,
        cardName,
        issuer: issuer ?? "Unknown",
        currency: currency ?? "USD",
        bonusAmount,
        spendRequired,
        spendDeadline: deadline,
        startDate: start,
        annualFee: annualFee ?? 0,
        isAnnualFeeWaived: isAnnualFeeWaived ?? false,
        externalCardId: externalCardId ?? null,
        cardProfileId: cardProfileId ?? null,
        notes: notes ?? null,
      },
    })

    return NextResponse.json(tracker)
  } catch (error) {
    return apiError("B1005", "Failed to create bonus tracker", 500, error)
  }
}

// PATCH — update spend or mark complete
export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) return apiError("B1006", "Authentication required", 401)

  try {
    const body = await request.json()
    const { id, currentSpend, isCompleted, notes } = body

    if (!id) return apiError("B1007", "Tracker ID required", 400)

    // Verify ownership
    const existing = await db.signUpBonusTracker.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return apiError("B1008", "Tracker not found", 404)

    const data: Record<string, unknown> = {}
    if (currentSpend !== undefined) data.currentSpend = currentSpend
    if (isCompleted !== undefined) {
      data.isCompleted = isCompleted
      if (isCompleted) data.completedAt = new Date()
    }
    if (notes !== undefined) data.notes = notes

    // Auto-complete if spend meets threshold
    if (currentSpend !== undefined && currentSpend >= existing.spendRequired) {
      data.isCompleted = true
      if (!existing.completedAt) data.completedAt = new Date()
    }

    const updated = await db.signUpBonusTracker.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    return apiError("B1009", "Failed to update tracker", 500, error)
  }
}

// DELETE — remove a tracker
export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return apiError("B1010", "Authentication required", 401)

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return apiError("B1011", "Tracker ID required", 400)

    const existing = await db.signUpBonusTracker.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return apiError("B1012", "Tracker not found", 404)

    await db.signUpBonusTracker.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError("B1013", "Failed to delete tracker", 500, error)
  }
}
