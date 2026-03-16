/**
 * Auto-identify unidentified credit cards using AI + available signals.
 * Called automatically after sync to resolve generic names like "Ultimate Rewards®"
 * into specific product names like "Chase Sapphire Preferred".
 */

import { db } from "@/lib/db"
import { decryptCredential } from "../crypto"
import { callAIProviderRaw, type AIProviderType } from "../ai-providers"
import { getKnownAnnualFee } from "@/components/finance/card-image-map"

const REWARDS_PROGRAM_NAMES = [
  "ultimate rewards", "membership rewards", "thankyou points",
  "thank you points", "cashback rewards", "cash back rewards",
  "venture rewards", "miles rewards",
]

const AI_SERVICES = ["ai_claude_cli", "ai_claude_api", "ai_openai", "ai_gemini"]

export function isUnidentifiedCard(cardName: string): boolean {
  const n = cardName.trim()
  if (/card\s*••••\d{4}$/i.test(n)) return true
  if (/^credit\s*card$/i.test(n)) return true
  if (/^business\s*(credit\s*)?card$/i.test(n)) return true
  const cleaned = n.replace(/[®™©]/g, "").trim().toLowerCase()
  if (REWARDS_PROGRAM_NAMES.some((rp) => cleaned === rp || cleaned.startsWith(rp))) return true
  if (n.length < 25 && /^[A-Z]{1,3}[.\s]/.test(n)) return true
  if (/^[A-Z]+\s[A-Z]+$/.test(n) && !/card|cash|reward|freedom|sapphire|platinum|gold|venture|discover/i.test(n)) return true
  return false
}

export async function autoIdentifyCards(userId: string): Promise<{ identified: number }> {
  const cards = await db.creditCardProfile.findMany({ where: { userId } })
  const unidentified = cards.filter((c) => isUnidentifiedCard(c.cardName))
  if (unidentified.length === 0) return { identified: 0 }

  const accountIds = unidentified.map((c) => c.accountId)

  const [accounts, liabilities, transactions] = await Promise.all([
    db.financeAccount.findMany({
      where: { id: { in: accountIds } },
      select: {
        id: true, name: true, mask: true, type: true, subtype: true,
        currentBalance: true, creditLimit: true,
        institution: { select: { institutionName: true } },
      },
    }),
    db.financeLiabilityCreditCard.findMany({
      where: { userId, accountId: { in: accountIds } },
    }),
    db.financeTransaction.findMany({
      where: {
        userId, accountId: { in: accountIds },
        date: { gte: new Date(Date.now() - 180 * 86_400_000) },
        isExcluded: false,
      },
      select: { accountId: true, merchantName: true, name: true, amount: true, category: true, plaidCategoryPrimary: true },
      orderBy: { amount: "desc" },
    }),
  ])

  const acctMap = new Map(accounts.map((a) => [a.id, a]))
  const liabMap = new Map(liabilities.map((l) => [l.accountId, l]))

  // Build spending signals per account
  const signalsMap = new Map<string, { topMerchants: string[]; topCategories: Array<{ category: string; total: number }>; txCount: number; totalSpend: number }>()
  for (const accountId of accountIds) {
    const txs = transactions.filter((t) => t.accountId === accountId && t.amount > 0)
    const merchants = new Map<string, number>()
    const cats = new Map<string, number>()
    let total = 0
    for (const tx of txs) {
      merchants.set(tx.merchantName ?? tx.name, (merchants.get(tx.merchantName ?? tx.name) ?? 0) + 1)
      const cat = tx.plaidCategoryPrimary ?? tx.category ?? "Other"
      cats.set(cat, (cats.get(cat) ?? 0) + tx.amount)
      total += tx.amount
    }
    signalsMap.set(accountId, {
      topMerchants: [...merchants.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n]) => n),
      topCategories: [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, t]) => ({ category: c, total: Math.round(t) })),
      txCount: txs.length,
      totalSpend: Math.round(total),
    })
  }

  // Build AI prompt
  const descriptions = unidentified.map((c) => {
    const acct = acctMap.get(c.accountId)
    const liab = liabMap.get(c.accountId)
    const sig = signalsMap.get(c.accountId)
    const aprs = liab?.aprs as Array<{ aprPercentage: number; aprType: string }> | null
    return [
      `CARD #${c.id.slice(-6)} (last4: ${acct?.mask ?? "?"})`,
      `  Institution: ${acct?.institution?.institutionName ?? "Unknown"}`,
      `  Account type: ${acct?.type ?? "credit"}`,
      `  Plaid name: "${acct?.name ?? ""}"`,
      `  Credit limit: ${acct?.creditLimit ? `$${acct.creditLimit.toLocaleString()}` : "No preset limit"}`,
      aprs?.length ? `  APRs: ${aprs.map((a) => `${a.aprType} ${a.aprPercentage}%`).join(", ")}` : "",
      sig ? `  Spend (6mo): $${sig.totalSpend.toLocaleString()}, ${sig.txCount} txns` : "",
      sig?.topMerchants.length ? `  Top merchants: ${sig.topMerchants.join(", ")}` : "",
      sig?.topCategories.length ? `  Top categories: ${sig.topCategories.map((c) => `${c.category} ($${c.total})`).join(", ")}` : "",
    ].filter(Boolean).join("\n")
  }).join("\n\n")

  const prompt = `You are a credit card identification expert. Identify the SPECIFIC card product for each card below.

${descriptions}

Use ALL signals: institution, credit limit, APRs, spending patterns, account type (business_credit = business card).
Respond ONLY with valid JSON array:
[{ "cardId": "last6chars", "productName": "Full Card Product Name", "annualFee": number_or_null, "confidence": "high|medium|low" }]

Include issuer in name (e.g., "Chase Sapphire Preferred"). For business cards include "Business". Set productName to null if truly unknown.`

  // Call AI
  const providerKey = await db.externalApiKey.findFirst({
    where: { userId, serviceName: { in: AI_SERVICES }, verified: true },
    orderBy: { updatedAt: "desc" },
  })

  let rawText: string
  if (providerKey) {
    const apiKey = await decryptCredential(providerKey.apiKeyEnc)
    rawText = await callAIProviderRaw({ provider: providerKey.serviceName as AIProviderType, apiKey, model: providerKey.model ?? undefined }, prompt)
  } else {
    rawText = await callAIProviderRaw({ provider: "ai_claude_cli", apiKey: "enabled" }, prompt)
  }

  const jsonMatch = rawText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    console.warn("[auto-identify-cards] AI returned invalid response")
    return { identified: 0 }
  }

  const results: Array<{ cardId: string; productName: string | null; annualFee?: number | null; confidence: string }> = JSON.parse(jsonMatch[0])
  let identified = 0

  for (const r of results) {
    if (!r.productName) continue
    const card = unidentified.find((c) => c.id.endsWith(r.cardId))
    if (!card) continue

    const acct = acctMap.get(card.accountId)
    const knownFee = getKnownAnnualFee(r.productName, acct?.institution?.institutionName ?? "")
    const fee = r.annualFee ?? knownFee

    await db.creditCardProfile.update({
      where: { id: card.id },
      data: { cardName: r.productName, ...(fee != null ? { annualFee: fee } : {}) },
    })

    // Also update the account display name so it shows everywhere
    if (card.accountId) {
      await db.financeAccount.update({
        where: { id: card.accountId },
        data: { name: r.productName },
      })
    }

    identified++
    console.info("[auto-identify-cards]", { card: r.productName, confidence: r.confidence, mask: acct?.mask })
  }

  return { identified }
}
