/**
 * Hotel search hook — manages hotel search state.
 */

import { useState, useCallback } from "react"
import type { HotelDashboardResults, HotelSearchConfig } from "@/types/travel"

export function useHotelSearch() {
  const [results, setResults] = useState<HotelDashboardResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (config: HotelSearchConfig) => {
    setIsSearching(true)
    setError(null)
    setResults(null)

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

      setResults(data as HotelDashboardResults)
    } catch (err) {
      setError((err as Error).message || "Hotel search failed")
    } finally {
      setIsSearching(false)
    }
  }, [])

  return { search, results, isSearching, error }
}
