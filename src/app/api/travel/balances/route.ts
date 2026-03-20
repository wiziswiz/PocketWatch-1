/**
 * Travel balances — returns user's points balances from CreditCardProfile data.
 * GET /api/travel/balances
 */

import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { cardProfilesToBalances } from "@/lib/travel/balance-adapter"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiError("T3001", "Authentication required", 401)

  try {
    const cards = await db.creditCardProfile.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        cardName: true,
        rewardType: true,
        rewardProgram: true,
        pointsBalance: true,
        cashbackBalance: true,
      },
    })

    const balances = cardProfilesToBalances(cards)
    return NextResponse.json({ balances })
  } catch (err) {
    return apiError("T3002", "Failed to load balances", 500, err)
  }
}
