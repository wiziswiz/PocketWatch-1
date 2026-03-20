"use client"

import { useHotelSearch } from "@/hooks/travel/use-hotel-search"
import { HotelSearchForm } from "@/components/travel/hotel-search-form"
import { HotelResults } from "@/components/travel/hotel-results"

export default function HotelsPage() {
  const { search, results, isSearching, error } = useHotelSearch()

  return (
    <div className="py-6 space-y-6">
      <HotelSearchForm onSearch={search} isSearching={isSearching} />

      {error && (
        <div className="card p-4 border-l-4" style={{ borderLeftColor: "var(--error)" }}>
          <p className="text-sm text-red-400 font-medium">Search failed</p>
          <p className="text-xs text-foreground-muted mt-1">{error}</p>
        </div>
      )}

      {results && <HotelResults hotels={results.hotels} />}

      {!results && !error && !isSearching && (
        <div className="card p-12 text-center">
          <span className="material-symbols-rounded text-foreground-muted/30 mb-3 block" style={{ fontSize: 48 }}>
            hotel
          </span>
          <p className="text-sm text-foreground-muted">
            Search for hotels to compare prices, ratings, and booking options.
          </p>
        </div>
      )}
    </div>
  )
}
