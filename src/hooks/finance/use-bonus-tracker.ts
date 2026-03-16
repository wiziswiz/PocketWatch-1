/**
 * Hooks for browsing card sign-up bonus offers.
 */

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { financeFetch, financeKeys } from "./shared"

// ─── Types ──────────────────────────────────────────────────────

export interface BonusSearchResult {
  cardId: string
  name: string
  issuer: string
  network: string
  currency: string
  isBusiness: boolean
  annualFee: number
  isAnnualFeeWaived: boolean
  imageUrl: string
  url: string
  offer: {
    bonusAmount: number
    spendRequired: number
    days: number
    currency?: string
  } | null
  historicalBest: number
  historicalPercent: number
  credits: { description: string; value: number }[]
}

interface BonusSearchResponse {
  cards: BonusSearchResult[]
  issuers: { name: string; count: number }[]
}

// ─── Hooks ──────────────────────────────────────────────────────

export function useBonusOffers(query: string, issuer: string) {
  return useQuery({
    queryKey: financeKeys.bonusSearch(`${query}|${issuer}`),
    queryFn: () => {
      const params = new URLSearchParams()
      if (query) params.set("q", query)
      if (issuer && issuer !== "All") params.set("issuer", issuer)
      return financeFetch<BonusSearchResponse>(
        `/cards/bonuses/search?${params.toString()}`,
      )
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  })
}
