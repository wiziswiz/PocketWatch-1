"use client"

import { useFinanceDeepInsights } from "@/hooks/use-finance"
import { useFinanceTrends, useRecurringStreams, useInvestmentHoldings } from "@/hooks/use-finance"
import { FinancePageHeader } from "@/components/finance/finance-page-header"
import { InsightsSection } from "@/components/finance/dashboard/insights-section"
import { FinanceCardSkeleton } from "@/components/finance/finance-loading"
import { FlexButton } from "@/components/finance/flex-button"

export default function InsightsPage() {
  const { data: deep, isLoading } = useFinanceDeepInsights()
  const { data: trends } = useFinanceTrends(6)
  const { data: recurringData } = useRecurringStreams()
  const { data: holdingsData } = useInvestmentHoldings()

  return (
    <div>
      <FinancePageHeader
        title="Insights & Analytics"
        actions={deep ? <FlexButton deep={deep} /> : undefined}
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <FinanceCardSkeleton key={i} />)}
          </div>
        ) : deep ? (
          <InsightsSection deep={deep} trends={trends} recurringData={recurringData} holdingsData={holdingsData} />
        ) : (
          <div className="bg-card rounded-xl p-8 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
            <span className="material-symbols-rounded text-foreground-muted mb-2 block" style={{ fontSize: 32 }}>analytics</span>
            <p className="text-sm text-foreground-muted">Connect accounts and add transactions to see insights.</p>
          </div>
        )}
      </div>
    </div>
  )
}
