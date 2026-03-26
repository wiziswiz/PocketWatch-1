/**
 * Hotel search hook — manages hotel search state with 6-hour localStorage cache.
 */

import { useState, useCallback, useEffect } from "react"
import type { HotelDashboardResults, HotelSearchConfig } from "@/types/travel"

// ─── Recent Searches ────────────────────────────────────────────

const RECENT_KEY = "pw-hotel-recent-searches"
const MAX_RECENT = 10

export interface RecentHotelSearch {
  query: string
  checkIn: string
  checkOut: string
  adults: number
  timestamp: number
}

function loadRecentSearches(): RecentHotelSearch[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as RecentHotelSearch[]) : []
  } catch {
    return []
  }
}

function saveRecentSearch(config: HotelSearchConfig) {
  try {
    const existing = loadRecentSearches()
    const entry: RecentHotelSearch = {
      query: config.query,
      checkIn: config.checkInDate,
      checkOut: config.checkOutDate,
      adults: config.adults,
      timestamp: Date.now(),
    }
    const filtered = existing.filter(
      (s) => !(s.query === entry.query && s.checkIn === entry.checkIn && s.checkOut === entry.checkOut),
    )
    const updated = [entry, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch { /* quota exceeded */ }
}

// ─── Result Cache ───────────────────────────────────────────────

const CACHE_KEY = "pw-hotel-result-cache"
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

interface CachedHotelResult {
  key: string
  data: HotelDashboardResults
  cachedAt: number
}

function buildCacheKey(config: HotelSearchConfig): string {
  return `${config.query}:${config.checkInDate}:${config.checkOutDate}:${config.adults}`
}

function loadCachedResult(config: HotelSearchConfig): { data: HotelDashboardResults; cachedAt: number } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entries = JSON.parse(raw) as CachedHotelResult[]
    const key = buildCacheKey(config)
    const match = entries.find((e) => e.key === key)
    if (!match) return null
    if (Date.now() - match.cachedAt > CACHE_TTL_MS) return null
    return { data: match.data, cachedAt: match.cachedAt }
  } catch {
    return null
  }
}

function saveCachedResult(config: HotelSearchConfig, data: HotelDashboardResults) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const entries: CachedHotelResult[] = raw ? (JSON.parse(raw) as CachedHotelResult[]) : []
    const key = buildCacheKey(config)
    const now = Date.now()
    const filtered = entries.filter((e) => e.key !== key && now - e.cachedAt < CACHE_TTL_MS)
    const updated = [{ key, data, cachedAt: now }, ...filtered].slice(0, 5)
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated))
  } catch {
    try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
  }
}

// ─── Hook ───────────────────────────────────────────────────────

export function useHotelSearch() {
  const [results, setResults] = useState<HotelDashboardResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cachedAt, setCachedAt] = useState<number | null>(null)
  const [recentSearches, setRecentSearches] = useState<RecentHotelSearch[]>([])

  useEffect(() => {
    setRecentSearches(loadRecentSearches())
  }, [])

  const search = useCallback(async (config: HotelSearchConfig, forceRefresh?: boolean) => {
    // Check cache first
    if (!forceRefresh) {
      const cached = loadCachedResult(config)
      if (cached) {
        setResults(cached.data)
        setCachedAt(cached.cachedAt)
        setError(null)
        saveRecentSearch(config)
        setRecentSearches(loadRecentSearches())
        return
      }
    }

    setIsSearching(true)
    setError(null)
    setResults(null)
    setCachedAt(null)

    saveRecentSearch(config)
    setRecentSearches(loadRecentSearches())

    try {
      const params = new URLSearchParams({
        q: config.query,
        checkIn: config.checkInDate,
        checkOut: config.checkOutDate,
        adults: String(config.adults),
      })

      const res = await fetch(`/api/travel/hotels?${params}`, { credentials: "include" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || `Search failed (${res.status})`)
        return
      }

      const result = data as HotelDashboardResults
      saveCachedResult(config, result)
      setResults(result)
    } catch (err) {
      setError((err as Error).message || "Hotel search failed")
    } finally {
      setIsSearching(false)
    }
  }, [])

  return { search, results, isSearching, error, cachedAt, recentSearches }
}
