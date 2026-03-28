"use client"

import { useMemo } from "react"
import { getCategoryMeta } from "@/lib/finance/categories"
import { BudgetProgressBar } from "@/components/finance/budget-progress-bar"
import { formatCurrency, cn } from "@/lib/utils"
import { FadeIn } from "@/components/motion/fade-in"
import { StaggerChildren, StaggerItem } from "@/components/motion/stagger-children"

interface Suggestion {
  category: string
  avgMonthly: number
  lastMonth: number
  monthsOfData: number
  suggested: number
}

interface TrendMonth {
  month: string
  categories: Record<string, number>
}

interface TopCategory {
  category: string
  total: number
}

interface BudgetDataDrivenProps {
  suggestions: Suggestion[]
  topCategories: TopCategory[]
  trendsData: { months: TrendMonth[] } | undefined
  totalSpending: number
  currentMonth: string
  onCreateBudget: () => void
}

export function BudgetDataDriven({
  suggestions,
  topCategories,
  trendsData,
  totalSpending,
  currentMonth,
  onCreateBudget,
}: BudgetDataDrivenProps) {
  // Merge suggestions + topCategories into a unified spending view
  const categories = useMemo(() => {
    const map = new Map<string, {
      category: string
      thisMonth: number
      avgMonthly: number
      lastMonth: number
      suggested: number
      monthsOfData: number
      trendData: number[]
    }>()

    // Start from suggestions (has historical data)
    for (const s of suggestions) {
      const trendData = trendsData?.months.map((m) => m.categories[s.category] ?? 0) ?? []
      map.set(s.category, {
        category: s.category,
        thisMonth: 0,
        avgMonthly: s.avgMonthly,
        lastMonth: s.lastMonth,
        suggested: s.suggested,
        monthsOfData: s.monthsOfData,
        trendData,
      })
    }

    // Fill in this month's actual spending from topCategories
    for (const tc of topCategories) {
      const existing = map.get(tc.category)
      if (existing) {
        existing.thisMonth = tc.total
      } else {
        map.set(tc.category, {
          category: tc.category,
          thisMonth: tc.total,
          avgMonthly: 0,
          lastMonth: 0,
          suggested: 0,
          monthsOfData: 0,
          trendData: [],
        })
      }
    }

    return [...map.values()]
      .filter((c) => c.thisMonth > 0 || c.avgMonthly > 0)
      .sort((a, b) => b.thisMonth - a.thisMonth)
  }, [suggestions, topCategories, trendsData])

  const totalThisMonth = categories.reduce((s, c) => s + c.thisMonth, 0)
  const totalAvg = categories.reduce((s, c) => s + c.avgMonthly, 0)

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <FadeIn>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard label="This Month" value={formatCurrency(totalThisMonth, "USD", 0)} sublabel={currentMonth} />
          <SummaryCard label="6-Month Avg" value={formatCurrency(totalAvg, "USD", 0)} sublabel="per month" />
          <SummaryCard
            label="vs Average"
            value={totalAvg > 0 ? `${totalThisMonth > totalAvg ? "+" : ""}${Math.round(((totalThisMonth - totalAvg) / totalAvg) * 100)}%` : "—"}
            sublabel={totalThisMonth > totalAvg ? "above average" : "below average"}
            valueColor={totalThisMonth > totalAvg ? "text-error" : "text-success"}
          />
        </div>
      </FadeIn>

      {/* Category breakdown */}
      <FadeIn delay={0.05}>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Spending by Category</h2>

          <StaggerChildren className="space-y-2" staggerMs={30}>
            {categories.map((cat) => {
              const meta = getCategoryMeta(cat.category)
              const pctOfTotal = totalThisMonth > 0 ? (cat.thisMonth / totalThisMonth) * 100 : 0
              const vsAvg = cat.avgMonthly > 0 ? ((cat.thisMonth - cat.avgMonthly) / cat.avgMonthly) * 100 : null

              return (
                <StaggerItem key={cat.category}>
                  <div className="bg-card border border-card-border rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.hex}18` }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18, color: meta.hex }}>{meta.icon}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-foreground truncate">{cat.category}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-data tabular-nums text-foreground">
                              {formatCurrency(cat.thisMonth, "USD", 0)}
                            </span>
                            <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md bg-foreground/5 text-foreground-muted">
                              {Math.round(pctOfTotal)}%
                            </span>
                          </div>
                        </div>

                        {/* Progress bar showing % of total spending */}
                        <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--foreground) 12%, var(--background-secondary))" }}>
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.max(pctOfTotal, 1)}%`, background: meta.hex }} />
                        </div>

                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-3">
                            {/* Sparkline */}
                            {cat.trendData.length > 0 && (
                              <div className="hidden sm:flex items-end gap-px" aria-hidden="true">
                                <Sparkline data={cat.trendData} color={meta.hex} />
                                <span className="text-[9px] text-foreground-muted ml-1.5 tabular-nums">
                                  avg {formatCurrency(cat.avgMonthly, "USD", 0)}
                                </span>
                              </div>
                            )}

                            {/* vs Average */}
                            {vsAvg !== null && Math.abs(vsAvg) > 5 && (
                              <span className={cn("text-[10px] font-semibold tabular-nums flex items-center gap-0.5", vsAvg > 0 ? "text-error" : "text-success")}>
                                <span className="material-symbols-rounded" style={{ fontSize: 11 }}>
                                  {vsAvg > 0 ? "arrow_upward" : "arrow_downward"}
                                </span>
                                {Math.abs(Math.round(vsAvg))}% vs avg
                              </span>
                            )}
                          </div>

                          {cat.lastMonth > 0 && (
                            <span className="text-[9px] text-foreground-muted tabular-nums">
                              last month {formatCurrency(cat.lastMonth, "USD", 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              )
            })}
          </StaggerChildren>
        </div>
      </FadeIn>

      {/* CTA to create a budget */}
      <FadeIn delay={0.15}>
        <div className="bg-card border border-dashed border-card-border rounded-2xl p-6 text-center">
          <span className="material-symbols-rounded text-primary mb-2 block" style={{ fontSize: 24 }}>tune</span>
          <p className="text-sm font-semibold text-foreground mb-1">Want to control your spending?</p>
          <p className="text-xs text-foreground-muted mb-3 max-w-sm mx-auto">
            Create a budget to set limits per category and track your progress against goals.
          </p>
          <button
            onClick={onCreateBudget}
            className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover transition-colors"
          >
            Create Your First Budget
          </button>
        </div>
      </FadeIn>
    </div>
  )
}

function SummaryCard({ label, value, sublabel, valueColor }: { label: string; value: string; sublabel: string; valueColor?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl px-4 py-3" style={{ boxShadow: "var(--shadow-sm)" }}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground-muted mb-1">{label}</p>
      <p className={cn("text-lg font-data font-bold tabular-nums", valueColor ?? "text-foreground")} style={{ letterSpacing: "-0.02em" }}>{value}</p>
      <p className="text-[10px] text-foreground-muted">{sublabel}</p>
    </div>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const last6 = data.slice(-6)
  if (last6.length === 0) return null
  const max = Math.max(...last6, 1)
  const barW = 4, gap = 2, h = 20, w = last6.length * (barW + gap) - gap
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      {last6.map((val, i) => {
        const barH = Math.max((val / max) * h, 1)
        return <rect key={i} x={i * (barW + gap)} y={h - barH} width={barW} height={barH} rx={1} fill={color} opacity={i === last6.length - 1 ? 1 : 0.4} />
      })}
    </svg>
  )
}
