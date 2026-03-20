/**
 * Balance Adapter — maps PocketWatch CreditCardProfile data to PointsBalance format
 * used by the travel search engine.
 */

import type { PointsBalance } from "@/types/travel"

interface CreditCardProfile {
  id: string
  cardName: string
  rewardType: string
  rewardProgram: string | null
  pointsBalance: number | null
  cashbackBalance: number | null
}

/** Map card reward program names to search engine program keys */
function mapProgramKey(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("chase") || lower.includes("ultimate rewards")) return "chase-ur"
  if (lower.includes("flying blue") || lower.includes("air france")) return "FLYING_BLUE"
  if (lower.includes("aeroplan") || lower.includes("air canada")) return "AEROPLAN"
  if (lower.includes("alaska")) return "ALASKA"
  if (lower.includes("united")) return "UNITED"
  if (lower.includes("delta")) return "DELTA"
  if (lower.includes("british") || lower.includes("avios")) return "BRITISH_AIRWAYS"
  if (lower.includes("emirates") && lower.includes("skywards")) return "EMIRATES"
  if (lower.includes("qatar")) return "QATAR"
  if (lower.includes("qantas")) return "QANTAS"
  if (lower.includes("virgin") && lower.includes("atlantic")) return "VIRGIN_ATLANTIC"
  if (lower.includes("marriott")) return "marriott"
  if (lower.includes("hilton")) return "hilton"
  if (lower.includes("southwest")) return "southwest"
  if (lower.includes("bilt")) return "bilt"
  if (lower.includes("amex") || lower.includes("membership rewards")) return "amex-mr"
  if (lower.includes("turkish")) return "TURKISH"
  if (lower.includes("singapore")) return "SINGAPORE"
  return lower.replace(/\s+/g, "-")
}

/**
 * Convert PocketWatch CreditCardProfile records into PointsBalance array
 * for the travel search engine.
 */
export function cardProfilesToBalances(cards: CreditCardProfile[]): PointsBalance[] {
  const balanceMap = new Map<string, PointsBalance>()

  for (const card of cards) {
    if (card.rewardType === "cashback") continue

    const balance = card.pointsBalance || 0
    if (balance <= 0) continue

    const programName = card.rewardProgram || card.cardName
    const programKey = mapProgramKey(programName)

    // Aggregate balances for the same program (user may have multiple cards)
    const existing = balanceMap.get(programKey)
    if (existing) {
      existing.balance += balance
      existing.displayBalance = existing.balance.toLocaleString()
    } else {
      balanceMap.set(programKey, {
        program: programName,
        programKey,
        balance,
        displayBalance: balance.toLocaleString(),
      })
    }
  }

  return Array.from(balanceMap.values()).sort((a, b) => b.balance - a.balance)
}
