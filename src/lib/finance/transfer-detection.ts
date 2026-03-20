/**
 * Transfer detection — identifies matching debit/credit pairs across accounts.
 * Marks detected transfers with isExcluded=true to exclude from spending analysis.
 */

import { db } from "@/lib/db"

const AMOUNT_TOLERANCE = 0.5
const DATE_TOLERANCE_DAYS = 2
const LOOKBACK_DAYS = 7

/**
 * Detect internal transfers by matching debit/credit pairs across different accounts.
 * Returns count of transfers detected (each transfer = 2 transactions marked).
 */
export async function detectTransfers(userId: string): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS)

  const transactions = await db.financeTransaction.findMany({
    where: {
      userId,
      isExcluded: false,
      isDuplicate: false,
      date: { gte: cutoff },
    },
    select: {
      id: true,
      accountId: true,
      amount: true,
      date: true,
    },
    orderBy: { date: "asc" },
  })

  const matched = new Set<string>()
  const transferPairs: Array<[string, string]> = []

  for (let i = 0; i < transactions.length; i++) {
    const a = transactions[i]
    if (matched.has(a.id)) continue

    for (let j = i + 1; j < transactions.length; j++) {
      const b = transactions[j]
      if (matched.has(b.id)) continue

      // Must be different accounts
      if (a.accountId === b.accountId) continue

      // Must be opposite signs
      if (Math.sign(a.amount) === Math.sign(b.amount)) continue
      if (a.amount === 0 || b.amount === 0) continue

      // Similar absolute amount (within tolerance)
      if (Math.abs(Math.abs(a.amount) - Math.abs(b.amount)) > AMOUNT_TOLERANCE) continue

      // Within date tolerance
      const dayDiff = Math.abs(a.date.getTime() - b.date.getTime()) / (1000 * 60 * 60 * 24)
      if (dayDiff > DATE_TOLERANCE_DAYS) continue

      // Match found
      matched.add(a.id)
      matched.add(b.id)
      transferPairs.push([a.id, b.id])
      break
    }
  }

  if (transferPairs.length === 0) return 0

  const allIds = transferPairs.flatMap(([a, b]) => [a, b])
  await db.financeTransaction.updateMany({
    where: { id: { in: allIds } },
    data: { isExcluded: true },
  })

  return transferPairs.length
}
