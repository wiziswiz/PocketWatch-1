"use client"

import { ReactNode, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { FINANCE_NAV_TABS } from "@/lib/portfolio/nav"
import { useFinanceAccounts, useFinanceDeepInsights } from "@/hooks/use-finance"

/**
 * Prefetch essential finance data in the layout so sub-pages load faster.
 * - accounts + deep insights: needed across all finance tabs (eager)
 * - budgets, trends, subscriptions: deferred to idle time
 */
function FinancePrefetch() {
  useFinanceAccounts()
  useFinanceDeepInsights()

  const qc = useQueryClient()
  useEffect(() => {
    const scheduleIdle = (fn: () => void, fallbackMs: number) => {
      if (typeof requestIdleCallback !== "undefined") {
        const id = requestIdleCallback(fn, { timeout: fallbackMs + 2000 })
        return () => cancelIdleCallback(id)
      }
      const t = setTimeout(fn, fallbackMs)
      return () => clearTimeout(t)
    }

    const fetchJSON = async (url: string) => {
      const res = await fetch(url, { credentials: "include" })
      if (!res.ok) throw new Error(`Failed to fetch ${url}`)
      return res.json()
    }

    const c1 = scheduleIdle(() => {
      qc.prefetchQuery({
        queryKey: ["finance", "budgets"],
        queryFn: () => fetchJSON("/api/finance/budgets"),
        staleTime: 5 * 60_000,
      })
    }, 1000)

    const c2 = scheduleIdle(() => {
      qc.prefetchQuery({
        queryKey: ["finance", "trends", 6],
        queryFn: () => fetchJSON("/api/finance/trends?months=6"),
        staleTime: 5 * 60_000,
      })
    }, 2000)

    const c3 = scheduleIdle(() => {
      qc.prefetchQuery({
        queryKey: ["finance", "subscriptions"],
        queryFn: () => fetchJSON("/api/finance/subscriptions"),
        staleTime: 5 * 60_000,
      })
    }, 3000)

    return () => { c1(); c2(); c3() }
  }, [qc])

  return null
}

function FinanceNav() {
  const pathname = usePathname()

  const activeTab = FINANCE_NAV_TABS.filter((tab) => {
    if (tab.href === "/finance") return pathname === "/finance"
    return pathname === tab.href || pathname.startsWith(tab.href + "/")
  }).sort((a, b) => b.href.length - a.href.length)[0]

  return (
    <div className="border-b border-card-border -mx-1 overflow-x-auto scrollbar-hide">
      <nav className="flex items-center gap-0 min-w-max px-1" role="tablist">
        {FINANCE_NAV_TABS.map((tab) => {
          const isActive = activeTab?.href === tab.href

          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "flex items-center gap-2 px-4 py-3 transition-colors duration-200 border-b-2 whitespace-nowrap text-sm",
                isActive
                  ? "text-primary border-b-primary font-medium"
                  : "text-foreground-muted border-b-transparent hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "material-symbols-rounded transition-colors duration-200",
                  isActive ? "text-primary" : "text-foreground-muted"
                )}
                style={{ fontSize: 15 }}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-0 fade-in">
      <FinancePrefetch />
      {children}
    </div>
  )
}
