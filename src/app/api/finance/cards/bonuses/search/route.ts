import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import {
  fetchBonusCards,
  searchCards,
  bestOffer,
  bestHistoricalAmount,
  offerTotal,
  formatIssuer,
  type BonusCard,
} from "@/lib/finance/card-bonuses-api"

function mapCard(card: BonusCard) {
  const offer = bestOffer(card)
  const histBest = bestHistoricalAmount(card)
  const currentAmount = offer ? offerTotal(offer) : 0
  const histPercent = histBest > 0 ? Math.round((currentAmount / histBest) * 100) : 100

  return {
    cardId: card.cardId,
    name: card.name,
    issuer: formatIssuer(card.issuer),
    network: card.network,
    currency: card.currency,
    isBusiness: card.isBusiness,
    annualFee: card.annualFee,
    isAnnualFeeWaived: card.isAnnualFeeWaived,
    imageUrl: card.imageUrl,
    url: card.url,
    offer: offer
      ? {
          bonusAmount: currentAmount,
          spendRequired: offer.spend,
          days: offer.days,
          currency: offer.amount[0]?.currency,
        }
      : null,
    historicalBest: histBest,
    historicalPercent: histPercent,
    credits: card.credits,
  }
}

// GET /api/finance/cards/bonuses/search?q=sapphire&issuer=Chase
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("BS001", "Authentication required", 401)

  try {
    const q = request.nextUrl.searchParams.get("q") ?? ""
    const issuer = request.nextUrl.searchParams.get("issuer") ?? ""
    const cards = await fetchBonusCards()

    let filtered: BonusCard[]

    if (q) {
      filtered = searchCards(cards, q)
    } else {
      // No search query: return all cards with active offers
      filtered = cards.filter((c) => c.offers.length > 0)
    }

    // Filter by issuer if specified
    if (issuer && issuer !== "All") {
      filtered = filtered.filter(
        (c) => formatIssuer(c.issuer) === issuer,
      )
    }

    const mapped = filtered
      .map(mapCard)
      .filter((c) => c.offer)
      .sort((a, b) => (b.offer?.bonusAmount ?? 0) - (a.offer?.bonusAmount ?? 0))

    // Also return available issuers for filter tabs
    const allWithOffers = cards.filter((c) => c.offers.length > 0)
    const issuerCounts = new Map<string, number>()
    for (const c of allWithOffers) {
      const name = formatIssuer(c.issuer)
      issuerCounts.set(name, (issuerCounts.get(name) ?? 0) + 1)
    }
    const issuers = [...issuerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({ cards: mapped, issuers })
  } catch (error) {
    return apiError("BS002", "Failed to search cards", 500, error)
  }
}
