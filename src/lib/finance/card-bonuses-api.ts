/** Client for the credit-card-bonuses-api (GitHub-hosted JSON). */

const DATA_URL =
  "https://raw.githubusercontent.com/andenacitelli/credit-card-bonuses-api/main/exports/data.json"

// ── Types ────────────────────────────────────────────────────────────

export interface BonusOffer {
  spend: number
  amount: { amount: number; currency?: string; weight?: number }[]
  days: number
  credits?: { description: string; value: number }[]
  expiration?: string
  url?: string
  referralUrl?: string
  details?: string
}

export interface CardCredit {
  description: string
  value: number
  weight?: number
  currency?: string
}

export interface BonusCard {
  cardId: string
  name: string
  issuer: string
  network: string
  currency: string
  isBusiness: boolean
  annualFee: number
  isAnnualFeeWaived: boolean
  universalCashbackPercent: number
  url: string
  imageUrl: string
  credits: CardCredit[]
  offers: BonusOffer[]
  historicalOffers: BonusOffer[]
  discontinued: boolean
}

// ── Cache ────────────────────────────────────────────────────────────

let cachedCards: BonusCard[] | null = null
let cacheTime = 0
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

export async function fetchBonusCards(): Promise<BonusCard[]> {
  if (cachedCards && Date.now() - cacheTime < CACHE_TTL) return cachedCards

  const res = await fetch(DATA_URL, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`Failed to fetch card bonuses: ${res.status}`)

  const data: BonusCard[] = await res.json()
  cachedCards = data.filter((c) => !c.discontinued)
  cacheTime = Date.now()
  return cachedCards
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Find the best current offer for a card. */
export function bestOffer(card: BonusCard): BonusOffer | null {
  if (!card.offers.length) return null
  return card.offers.reduce((best, o) => {
    const total = o.amount.reduce((s, a) => s + a.amount, 0)
    const bestTotal = best.amount.reduce((s, a) => s + a.amount, 0)
    return total > bestTotal ? o : best
  })
}

/** Get the best historical offer amount for comparison. */
export function bestHistoricalAmount(card: BonusCard): number {
  if (!card.historicalOffers.length) return 0
  return Math.max(
    ...card.historicalOffers.map((o) =>
      o.amount.reduce((s, a) => s + a.amount, 0),
    ),
  )
}

/** Total bonus amount from an offer. */
export function offerTotal(offer: BonusOffer): number {
  return offer.amount.reduce((s, a) => s + a.amount, 0)
}

/** Search cards by name (fuzzy-ish). */
export function searchCards(cards: BonusCard[], query: string): BonusCard[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return cards
    .filter((c) => c.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
      return aStarts - bStarts || a.name.localeCompare(b.name)
    })
    .slice(0, 20)
}

/** Normalize issuer name for display. */
export function formatIssuer(issuer: string): string {
  const map: Record<string, string> = {
    AMERICAN_EXPRESS: "Amex",
    CHASE: "Chase",
    CAPITAL_ONE: "Capital One",
    CITI: "Citi",
    BANK_OF_AMERICA: "Bank of America",
    DISCOVER: "Discover",
    WELLS_FARGO: "Wells Fargo",
    US_BANK: "U.S. Bank",
    BARCLAYS: "Barclays",
  }
  return map[issuer] ?? issuer.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
