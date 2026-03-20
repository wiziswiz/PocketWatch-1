"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import type { UnifiedHotelResult } from "@/types/travel"
import { HotelResultCard } from "./hotel-result-card"
import { cn } from "@/lib/utils"

const HotelMapView = dynamic(() => import("./hotel-map-view").then((m) => ({ default: m.HotelMapView })), {
  ssr: false,
  loading: () => (
    <div className="card p-8 text-center">
      <p className="text-sm text-foreground-muted">Loading map...</p>
    </div>
  ),
})

interface HotelResultsProps {
  hotels: UnifiedHotelResult[]
}

type PricingFilter = "all" | "cash" | "points"
type SortKey = "price" | "points" | "rating" | "reviews"
type ViewMode = "grid" | "map"

export function HotelResults({ hotels }: HotelResultsProps) {
  const [pricingFilter, setPricingFilter] = useState<PricingFilter>("all")
  const [sortBy, setSortBy] = useState<SortKey>("price")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set())
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false)
  const brandDropdownRef = useRef<HTMLDivElement>(null)

  const hasPointsHotels = hotels.some((h) => h.pointsPerNight != null && h.pointsPerNight > 0)
  const hasMappableHotels = hotels.some((h) => h.latitude != null && h.longitude != null)

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>()
    for (const h of hotels) {
      if (h.brand) brands.add(h.brand)
    }
    return [...brands].sort()
  }, [hotels])

  // Close brand dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setBrandDropdownOpen(false)
      }
    }
    if (brandDropdownOpen) {
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [brandDropdownOpen])

  const filtered = useMemo(() => {
    let result = [...hotels]

    if (pricingFilter === "cash") {
      result = result.filter((h) => h.cashPerNight != null && h.cashPerNight > 0)
    } else if (pricingFilter === "points") {
      result = result.filter((h) => h.pointsPerNight != null && h.pointsPerNight > 0)
    }

    if (selectedBrands.size > 0) {
      result = result.filter((h) => h.brand != null && selectedBrands.has(h.brand))
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
  }, [hotels, pricingFilter, sortBy, selectedBrands])

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

  function toggleBrand(brand: string) {
    setSelectedBrands((prev) => {
      const next = new Set(prev)
      if (next.has(brand)) {
        next.delete(brand)
      } else {
        next.add(brand)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Filter + sort controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-xs text-foreground-muted">
            {filtered.length} hotel{filtered.length !== 1 ? "s" : ""}
            {pricingFilter !== "all" || selectedBrands.size > 0 ? " (filtered)" : ""}
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

          {/* Brand filter dropdown */}
          {uniqueBrands.length > 0 && (
            <div className="relative" ref={brandDropdownRef}>
              <button
                onClick={() => setBrandDropdownOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  selectedBrands.size > 0
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-card text-foreground-muted border-card-border hover:text-foreground",
                )}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>apartment</span>
                {selectedBrands.size === 0 ? "All Chains" : `${selectedBrands.size} chain${selectedBrands.size !== 1 ? "s" : ""}`}
                <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
                  {brandDropdownOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {brandDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-card-border rounded-lg shadow-lg py-1 min-w-[180px] max-h-[240px] overflow-y-auto">
                  {selectedBrands.size > 0 && (
                    <button
                      onClick={() => setSelectedBrands(new Set())}
                      className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-primary/5"
                    >
                      Clear all
                    </button>
                  )}
                  {uniqueBrands.map((brand) => (
                    <label
                      key={brand}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-card-border/30 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.has(brand)}
                        onChange={() => toggleBrand(brand)}
                        className="rounded border-card-border"
                      />
                      {brand}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          {hasMappableHotels && (
            <div className="flex items-center gap-1 bg-card rounded-lg p-1 border border-card-border">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground-muted hover:text-foreground",
                )}
                title="Grid view"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>grid_view</span>
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  viewMode === "map"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground-muted hover:text-foreground",
                )}
                title="Map view"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>map</span>
              </button>
            </div>
          )}

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
      </div>

      {/* Content: Map or Grid */}
      {viewMode === "map" ? (
        <HotelMapView hotels={filtered} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((hotel) => (
            <HotelResultCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
      )}

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
