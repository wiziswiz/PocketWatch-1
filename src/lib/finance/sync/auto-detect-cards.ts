/**
 * Auto-detect credit card profiles from finance accounts.
 * Called after Plaid/SimpleFIN sync to automatically create CreditCardProfile
 * records for any credit accounts that don't have one yet.
 */

import { db } from "@/lib/db"

export async function autoDetectCreditCards(userId: string): Promise<{ created: number }> {
  const [creditAccounts, existingCards] = await Promise.all([
    db.financeAccount.findMany({
      where: { userId, type: { in: ["credit", "business_credit"] } },
      include: { institution: { select: { institutionName: true } } },
    }),
    db.creditCardProfile.findMany({
      where: { userId },
      select: { accountId: true },
    }),
  ])

  const linkedAccountIds = new Set(existingCards.map((c) => c.accountId).filter(Boolean))
  const unlinked = creditAccounts.filter((a) => !linkedAccountIds.has(a.id))

  if (unlinked.length === 0) return { created: 0 }

  let created = 0
  for (const acct of unlinked) {
    const cardName = deriveCardName(acct.name, acct.officialName, acct.mask, acct.institution.institutionName)

    await db.creditCardProfile.create({
      data: {
        userId,
        accountId: acct.id,
        cardName,
        cardNetwork: "visa",
        rewardType: "cashback",
        annualFee: 0,
        bonusCategories: [],
      },
    })
    created++
  }

  console.info("[auto-detect-cards]", { userId, created, total: creditAccounts.length })
  return { created }
}

function deriveCardName(
  name: string,
  officialName: string | null,
  mask: string | null,
  institutionName: string,
): string {
  const fallback = `${institutionName} Card${mask ? ` ••••${mask}` : ""}`

  if (officialName) {
    const official = officialName.trim()
    if (official.length > 3 && !looksLikePersonalName(official)) {
      return official
    }
  }

  if (name) {
    const trimmed = name.trim()
    if (trimmed.length > 3 && !looksLikePersonalName(trimmed) && !isGenericCardName(trimmed)) {
      return trimmed
    }
  }

  return fallback
}

function looksLikePersonalName(s: string): boolean {
  const parts = s.split(/\s+/)
  if (parts.length < 2 || parts.length > 3) return false
  return parts.every((p) => /^[A-Z][a-z]+$/.test(p))
}

function isGenericCardName(s: string): boolean {
  const lower = s.toLowerCase()
  return lower === "credit card" || lower === "card" || /^card\s*[•·.\-\d]+$/.test(lower)
}
