/**
 * Daily yield accrual for manual investment accounts with APY.
 * Tracks principal vs earned interest separately.
 * Idempotent: only accrues once per calendar day (checks updatedAt).
 */

import { db } from "@/lib/db"

function todayUtc(): Date {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
}

/**
 * Accrue daily yield for all manual investment accounts with APY set.
 * Updates currentBalance AND yieldEarned. Skips accounts already updated today.
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
    select: { id: true, currentBalance: true, apy: true, yieldEarned: true, updatedAt: true },
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
    const dailyYield = Math.round(acct.currentBalance * dailyRate * 100) / 100
    const newBalance = Math.round((acct.currentBalance + dailyYield) * 100) / 100
    const newYieldEarned = Math.round(((acct.yieldEarned ?? 0) + dailyYield) * 100) / 100

    await db.financeAccount.update({
      where: { id: acct.id },
      data: { currentBalance: newBalance, yieldEarned: newYieldEarned },
    })

    updated++
  }

  if (updated > 0) {
    console.info(`[yield-accrual] userId=${userId} accounts=${updated}`)
  }

  return { updated }
}

/**
 * Update APY for a yield account — logs the change in apyHistory.
 */
export async function updateYieldRate(
  accountId: string,
  newApy: number,
  note?: string,
): Promise<void> {
  const account = await db.financeAccount.findUnique({
    where: { id: accountId },
    select: { apy: true, apyHistory: true },
  })
  if (!account) return

  const history = (account.apyHistory as Array<{ apy: number; date: string; note?: string }>) ?? []
  const entry = {
    apy: account.apy ?? 0,
    date: new Date().toISOString().split("T")[0],
    ...(note ? { note } : {}),
  }

  await db.financeAccount.update({
    where: { id: accountId },
    data: {
      apy: newApy,
      apyHistory: [...history, entry],
    },
  })
}

/**
 * Correct the balance of a yield account — recalculates yieldEarned from principal.
 */
export async function correctYieldBalance(
  accountId: string,
  actualBalance: number,
): Promise<void> {
  const account = await db.financeAccount.findUnique({
    where: { id: accountId },
    select: { principalDeposited: true },
  })
  if (!account) return

  const principal = account.principalDeposited ?? 0
  const yieldEarned = Math.max(0, Math.round((actualBalance - principal) * 100) / 100)

  await db.financeAccount.update({
    where: { id: accountId },
    data: { currentBalance: actualBalance, yieldEarned },
  })
}
