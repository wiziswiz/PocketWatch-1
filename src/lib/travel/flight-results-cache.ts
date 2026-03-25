/**
 * In-memory cache of flight search results keyed by userId.
 * Used by PocketLLM chat tools to answer questions about recent searches.
 * Uses globalThis to survive HMR in development (same pattern as Prisma singleton).
 */

import type { DashboardResults } from "@/types/travel"

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface CacheEntry {
  results: DashboardResults
  expiry: number
}

const globalForCache = globalThis as unknown as { __pocketwatch_flight_cache?: Map<string, CacheEntry> }
const userFlightCache = globalForCache.__pocketwatch_flight_cache ?? (globalForCache.__pocketwatch_flight_cache = new Map())

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
