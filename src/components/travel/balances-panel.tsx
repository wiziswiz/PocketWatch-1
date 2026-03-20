"use client"

import type { PointsBalance } from "@/types/travel"
import { PROGRAM_DISPLAY_NAMES } from "@/lib/travel/constants"

interface BalancesPanelProps {
  balances: PointsBalance[]
}

export function BalancesPanel({ balances }: BalancesPanelProps) {
  if (balances.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">Points Balances</h3>
        <p className="text-xs text-foreground-muted">
          No points balances found. Add credit cards in{" "}
          <a href="/finance/cards" className="text-primary hover:underline">Cards & Bills</a>{" "}
          to see your balances here.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-bold text-foreground mb-3">Points Balances</h3>
      <div className="space-y-2">
        {balances.map((b) => {
          const displayName = PROGRAM_DISPLAY_NAMES[b.programKey] || b.program
          return (
            <div key={b.programKey} className="flex items-center justify-between py-1">
              <span className="text-xs text-foreground-muted truncate mr-2">{displayName}</span>
              <span className="text-xs font-mono font-medium text-foreground tabular-nums">
                {b.displayBalance}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
