/**
 * In-memory cache of flight search results keyed by userId.
 * Used by PocketLLM chat tools to answer questions about recent searches.
 */

import type { DashboardResults } from "@/types/travel"

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface CacheEntry {
  results: DashboardResults
  expiry: number
}

const userFlightCache = new Map<string, CacheEntry>()

export function setUserFlightResults(userId: string, results: DashboardResults): void {
  userFlightCache.set(userId, {
    results,
    expiry: Date.now() + CACHE_TTL_MS,
  })
}

export function getUserFlightResults(userId: string): DashboardResults | null {
  const entry = userFlightCache.get(userId)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    userFlightCache.delete(userId)
    return null
  }
  return entry.results
}
