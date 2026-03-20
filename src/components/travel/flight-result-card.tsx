"use client"

import type { ValueScoredFlight } from "@/types/travel"
import { cn } from "@/lib/utils"
import { SweetSpotBadge } from "./sweet-spot-badge"
import { PROGRAM_DISPLAY_NAMES } from "@/lib/travel/constants"

interface FlightResultCardProps {
  flight: ValueScoredFlight
}

const cppRatingColors: Record<string, string> = {
  exceptional: "text-emerald-400",
  great: "text-blue-400",
  good: "text-foreground",
  fair: "text-amber-400",
  poor: "text-foreground-muted",
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m > 0 ? `${m}m` : ""}`
}

export function FlightResultCard({ flight }: FlightResultCardProps) {
  const isAward = flight.type === "award"
  const programName = flight.pointsProgram
    ? PROGRAM_DISPLAY_NAMES[flight.pointsProgram] || flight.pointsProgram
    : null

  return (
    <a
      href={flight.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block card p-4 hover:translate-y-[-1px] hover:shadow-md transition-all duration-200"
    >
      {/* Header: airline + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground truncate">{flight.airline}</span>
            <span className={cn(
              "text-[10px] font-medium uppercase px-1.5 py-0.5 rounded",
              flight.cabinClass === "first" ? "bg-amber-500/10 text-amber-400" :
              flight.cabinClass === "business" ? "bg-blue-500/10 text-blue-400" :
              "bg-card-border/50 text-foreground-muted"
            )}>
              {flight.cabinClass}
            </span>
            {flight.sweetSpotMatch && <SweetSpotBadge match={flight.sweetSpotMatch} />}
          </div>
          <p className="text-xs text-foreground-muted mt-0.5">
            {flight.airports.join(" → ")} • {formatDuration(flight.durationMinutes)} • {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
          </p>
          {flight.flightNumbers.length > 0 && (
            <p className="text-[11px] text-foreground-muted/70">{flight.flightNumbers.join(" / ")}</p>
          )}
        </div>

        {/* Price / Points */}
        <div className="text-right flex-shrink-0">
          {isAward ? (
            <>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {(flight.points || 0).toLocaleString()} pts
              </p>
              {flight.taxes > 0 && (
                <p className="text-[11px] text-foreground-muted">+ ${flight.taxes} taxes</p>
              )}
              {programName && (
                <p className="text-[10px] text-foreground-muted/70">{programName}</p>
              )}
            </>
          ) : (
            <p className="text-sm font-bold text-foreground tabular-nums">
              ${flight.cashPrice?.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Value metrics for award flights */}
      {isAward && flight.realCpp !== null && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-card-border/50">
          <span className={cn("text-xs font-bold tabular-nums", cppRatingColors[flight.cppRating || ""])}>
            {flight.realCpp}c/pt
          </span>
          {flight.cashComparable && (
            <span className="text-[11px] text-foreground-muted">
              vs ${flight.cashComparable.toLocaleString()} cash
              {flight.cashSource === "exact-match" ? " (exact)" : flight.cashSource === "same-cabin" ? " (avg)" : ""}
            </span>
          )}
          <span className="ml-auto text-[10px] text-foreground-muted/70">
            Score: {flight.valueScore}/100
          </span>
        </div>
      )}

      {/* Funding path */}
      {isAward && flight.fundingPath && (
        <div className="mt-1.5">
          <p className={cn(
            "text-[11px]",
            flight.canAfford ? "text-emerald-400" : "text-amber-400"
          )}>
            {flight.affordDetails}
          </p>
        </div>
      )}
    </a>
  )
}
