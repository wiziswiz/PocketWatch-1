/**
 * Daily yield accrual for manual investment accounts with APY.
 * Compounds balance: newBalance = currentBalance * (1 + apy / 365)
 * Idempotent: only accrues once per calendar day (checks updatedAt).
 */

import { db } from "@/lib/db"

function todayUtc(): Date {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
}

/**
 * Accrue daily yield for all manual investment accounts with APY set.
 * Skips accounts already updated today (idempotent).
 */
export async function accrueYield(userId: string): Promise<{ updated: number }> {
  const today = todayUtc()

  const accounts = await db.financeAccount.findMany({
    where: {
      userId,
      apy: { not: null },
      currentBalance: { not: null },
      institution: { provider: "manual" },
    },
    select: { id: true, currentBalance: true, apy: true, updatedAt: true },
  })

  let updated = 0

  for (const acct of accounts) {
    if (!acct.apy || !acct.currentBalance || acct.currentBalance <= 0) continue

    // Skip if already accrued today
    const lastUpdate = new Date(Date.UTC(
      acct.updatedAt.getUTCFullYear(),
      acct.updatedAt.getUTCMonth(),
      acct.updatedAt.getUTCDate(),
    ))
    if (lastUpdate.getTime() >= today.getTime()) continue

    const dailyRate = acct.apy / 365
    const newBalance = Math.round(acct.currentBalance * (1 + dailyRate) * 100) / 100

    await db.financeAccount.update({
      where: { id: acct.id },
      data: { currentBalance: newBalance },
    })

    updated++
  }

  if (updated > 0) {
    console.info(`[yield-accrual] userId=${userId} accounts=${updated}`)
  }

  return { updated }
}
