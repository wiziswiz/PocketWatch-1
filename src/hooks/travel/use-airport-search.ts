import { useMemo } from "react"
import { AIRPORTS } from "@/lib/travel/airport-data"
import type { Airport } from "@/lib/travel/airport-types"

const MAX_RESULTS = 8

function scoreMatch(airport: Airport, q: string): number {
  const iata = airport.iata.toLowerCase()
  const city = airport.city.toLowerCase()
  const name = airport.name.toLowerCase()
  const country = airport.country.toLowerCase()

  if (iata === q) return 100
  if (iata.startsWith(q)) return 90
  if (city === q) return 85
  if (city.startsWith(q)) return 80
  if (airport.keywords?.some(k => k.toLowerCase().startsWith(q))) return 75
  if (name.startsWith(q)) return 70
  if (city.includes(q)) return 60
  if (airport.keywords?.some(k => k.toLowerCase().includes(q))) return 55
  if (name.includes(q)) return 50
  if (country.startsWith(q)) return 40
  if (country.includes(q)) return 30

  return 0
}

/**
 * Client-side airport fuzzy search.
 * Returns up to 8 scored results matching the query by IATA, city, name, or country.
 * Excludes already-selected codes.
 */
export function useAirportSearch(query: string, excludeCodes: readonly string[] = []): readonly Airport[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length === 0) return []

    const excludeSet = new Set(excludeCodes)

    const scored: { airport: Airport; score: number }[] = []
    for (const airport of AIRPORTS) {
      if (excludeSet.has(airport.iata)) continue
      const score = scoreMatch(airport, q)
      if (score > 0) scored.push({ airport, score })
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, MAX_RESULTS).map(s => s.airport)
  }, [query, excludeCodes])
}
