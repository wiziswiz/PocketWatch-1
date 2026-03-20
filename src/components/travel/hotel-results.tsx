"use client"

import { useState, useMemo } from "react"
import type { UnifiedHotelResult } from "@/types/travel"
import { HotelResultCard } from "./hotel-result-card"
import { cn } from "@/lib/utils"

interface HotelResultsProps {
  hotels: UnifiedHotelResult[]
}

type PricingFilter = "all" | "cash" | "points"
type SortKey = "price" | "points" | "rating" | "reviews"

export function HotelResults({ hotels }: HotelResultsProps) {
  const [pricingFilter, setPricingFilter] = useState<PricingFilter>("all")
  const [sortBy, setSortBy] = useState<SortKey>("price")

  const hasPointsHotels = hotels.some((h) => h.pointsPerNight != null && h.pointsPerNight > 0)

  const filtered = useMemo(() => {
    let result = [...hotels]

    if (pricingFilter === "cash") {
      result = result.filter((h) => h.cashPerNight != null && h.cashPerNight > 0)
    } else if (pricingFilter === "points") {
      result = result.filter((h) => h.pointsPerNight != null && h.pointsPerNight > 0)
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "price":
          return (a.cashPerNight || Infinity) - (b.cashPerNight || Infinity)
        case "points":
          return (a.pointsPerNight || Infinity) - (b.pointsPerNight || Infinity)
        case "rating":
          return b.overallRating - a.overallRating
        case "reviews":
          return b.reviews - a.reviews
        default:
          return 0
      }
    })

    return result
  }, [hotels, pricingFilter, sortBy])

  if (hotels.length === 0) {
    return (
      <div className="card p-8 text-center">
        <span className="material-symbols-rounded text-foreground-muted/30 mb-2 block" style={{ fontSize: 36 }}>
          search_off
        </span>
        <p className="text-sm text-foreground-muted">No hotels found for this search.</p>
      </div>
    )
  }

  const pricingOptions: { key: PricingFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "cash", label: "Cash" },
    { key: "points", label: "Points" },
  ]

  return (
    <div className="space-y-4">
      {/* Filter + sort controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-xs text-foreground-muted">
            {filtered.length} hotel{filtered.length !== 1 ? "s" : ""}
            {pricingFilter !== "all" ? " (filtered)" : ""}
          </p>

          {hasPointsHotels && (
            <div className="flex items-center gap-1 bg-card rounded-lg p-1 border border-card-border">
              {pricingOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPricingFilter(opt.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    pricingFilter === opt.key
                      ? "bg-primary/10 text-primary"
                      : "text-foreground-muted hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-card border border-card-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
        >
          <option value="price">Lowest Cash Price</option>
          {hasPointsHotels && <option value="points">Lowest Points</option>}
          <option value="rating">Highest Rating</option>
          <option value="reviews">Most Reviews</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((hotel) => (
          <HotelResultCard key={hotel.id} hotel={hotel} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card p-8 text-center">
          <span className="material-symbols-rounded text-foreground-muted mb-2 block" style={{ fontSize: 32 }}>
            filter_list_off
          </span>
          <p className="text-sm text-foreground-muted">No hotels match your filters.</p>
        </div>
      )}
    </div>
  )
}
