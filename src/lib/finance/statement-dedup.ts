/**
 * Deduplication logic for statement uploads.
 * Handles both exact (re-upload) and fuzzy (cross-provider) dedup.
 */

import { createHash } from "crypto"
import { db } from "@/lib/db"
import { cleanMerchantName } from "./categorize"
import { stringSimilarity } from "./normalize"
import type { ParsedRow } from "./statement-types"

export function generateExternalId(accountId: string, row: ParsedRow, seq: number): string {
  const dateStr = row.date.toISOString().split("T")[0]
  const hash = createHash("sha256")
    .update(`${accountId}|${dateStr}|${row.amount}|${row.name}|${seq}`)
    .digest("hex")
    .slice(0, 32) // 32 hex chars = 128-bit collision resistance
  return `stmt_${hash}`
}

export function assignSequences(rows: ParsedRow[]): number[] {
  const groupCounts = new Map<string, number>()
  return rows.map((row) => {
    const key = `${row.date.toISOString().split("T")[0]}|${row.amount}|${row.name}`
    const seq = (groupCounts.get(key) ?? 0) + 1
    groupCounts.set(key, seq)
    return seq
  })
}

export async function findFuzzyDuplicates(
  userId: string,
  accountId: string,
  rows: ParsedRow[]
): Promise<Set<number>> {
  if (rows.length === 0) return new Set()

  const dates = rows.map((r) => r.date)
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())) - 86400000)
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())) + 86400000)

  const existing = await db.financeTransaction.findMany({
    where: {
      userId,
      accountId,
      provider: { not: "statement" }, // Match against synced providers (plaid, simplefin) — skip other statement uploads (exact dedup handles those)
      date: { gte: minDate, lte: maxDate },
    },
    select: { date: true, amount: true, name: true },
  })

  const dupeIndices = new Set<number>()
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowDate = row.date.getTime()

    for (const ex of existing) {
      const dateDiff = Math.abs(ex.date.getTime() - rowDate)
      if (dateDiff > 86400000) continue
      if (Math.abs(ex.amount - row.amount) > 0.01) continue

      const cleaned = cleanMerchantName(row.name)
      const exCleaned = cleanMerchantName(ex.name)
      if (stringSimilarity(cleaned, exCleaned) > 0.6) {
        dupeIndices.add(i)
        break
      }
    }
  }

  return dupeIndices
}
