"use client"

import { useMemo } from "react"
import { getNearbyAirports } from "@/lib/travel/nearby-airports"

interface NearbyAirportChipsProps {
  codes: string[]
  field: "origin" | "destination"
  onAdd: (field: "origin" | "destination", code: string) => void
}

export function NearbyAirportChips({ codes, field, onAdd }: NearbyAirportChipsProps) {
  const nearby = useMemo(() => {
    if (codes.length === 0) return []
    const results = getNearbyAirports(codes[0]!)
    return results.filter(code => !codes.includes(code))
  }, [codes])

  if (nearby.length === 0) return null

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      <span className="text-[10px] text-foreground-muted">Nearby:</span>
      {nearby.map(code => (
        <button
          key={code}
          type="button"
          onClick={() => onAdd(field, code)}
          className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono"
        >
          +{code}
        </button>
      ))}
    </div>
  )
}
