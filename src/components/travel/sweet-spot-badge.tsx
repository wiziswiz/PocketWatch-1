"use client"

import type { SweetSpotMatch } from "@/types/travel"

interface SweetSpotBadgeProps {
  match: SweetSpotMatch
}

export function SweetSpotBadge({ match }: SweetSpotBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{
        background: "linear-gradient(135deg, var(--success), color-mix(in srgb, var(--success) 80%, #000))",
        color: "white",
      }}
      title={match.spot.description}
    >
      <span className="material-symbols-rounded" style={{ fontSize: 12 }}>
        target
      </span>
      Sweet Spot • {match.actualCpp}c/pt
    </span>
  )
}
