"use client"

import { useAccountCoverage } from "@/hooks/finance"
import type { AccountCoverage } from "@/lib/finance/statement-types"

function MonthGrid({ monthsWithData, monthsNoActivity = [] }: { monthsWithData: string[]; monthsNoActivity?: string[] }) {
  const now = new Date()
  const year = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth()
  const withDataSet = new Set(monthsWithData)
  const noActivitySet = new Set(monthsNoActivity)

  const months = Array.from({ length: currentMonth + 1 }, (_, m) => {
    const d = new Date(Date.UTC(year, m, 1))
    const key = `${year}-${String(m + 1).padStart(2, "0")}`
    const hasData = withDataSet.has(key)
    const noActivity = noActivitySet.has(key)
    return { key, label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }), hasData, noActivity }
  })

  return (
    <div className="flex gap-1">
      {months.map((m) => (
        <div
          key={m.key}
          title={`${m.key}: ${m.hasData ? "Has data" : m.noActivity ? "No activity" : "Missing"}`}
          className={`text-center text-[11px] py-1 px-2 rounded font-medium tracking-wide transition-colors ${
            m.hasData
              ? "bg-foreground/[0.07] text-foreground border border-foreground/[0.08]"
              : m.noActivity
                ? "bg-success/20 text-success border border-success/30 font-semibold"
                : "border border-dashed border-card-border text-foreground-muted/35"
          }`}
        >
          {m.label}
        </div>
      ))}
    </div>
  )
}

function AccountRow({ coverage }: { coverage: AccountCoverage }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-card-border/40 last:border-0 last:pb-0 first:pt-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-foreground truncate">{coverage.accountName}</span>
        {coverage.mask && (
          <span className="text-foreground-muted/60 text-xs shrink-0">····{coverage.mask}</span>
        )}
        <span className="text-foreground-muted/50 text-[10px] bg-card-border/20 px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider">
          {coverage.type}
        </span>
      </div>
      <MonthGrid monthsWithData={coverage.monthsWithData} monthsNoActivity={coverage.monthsNoActivity} />
    </div>
  )
}

function InstitutionGroup({
  institutionName,
  provider,
  accounts,
}: {
  institutionName: string
  provider: string
  accounts: AccountCoverage[]
}) {
  const totalMissing = accounts.reduce((sum, a) => sum + a.monthsMissing.length, 0)

  return (
    <div className="border border-card-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">{institutionName}</span>
          <span className="text-[10px] text-foreground-muted/50 bg-card-border/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
            {provider}
          </span>
        </div>
        {totalMissing > 0 ? (
          <span className="text-[11px] text-foreground-muted tabular-nums">
            {totalMissing} {totalMissing === 1 ? "month" : "months"} missing
          </span>
        ) : (
          <span className="text-[11px] text-success/70">Complete</span>
        )}
      </div>
      {accounts.map((acct) => (
        <AccountRow key={acct.accountId} coverage={acct} />
      ))}
    </div>
  )
}

export function StatementCoverageContent() {
  const { data, isLoading } = useAccountCoverage()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-5 animate-shimmer rounded w-48" />
        <div className="h-20 animate-shimmer rounded" />
      </div>
    )
  }

  const accounts = data?.accounts ?? []
  if (accounts.length === 0) {
    return <p className="text-xs text-foreground-muted">No accounts connected yet.</p>
  }

  const grouped = new Map<string, { institutionName: string; provider: string; accounts: AccountCoverage[] }>()
  for (const acct of accounts) {
    const key = `${acct.institutionName}::${acct.provider}`
    const group = grouped.get(key) ?? {
      institutionName: acct.institutionName,
      provider: acct.provider,
      accounts: [],
    }
    group.accounts.push(acct)
    grouped.set(key, group)
  }

  const totalMissing = accounts.reduce((sum, a) => sum + a.monthsMissing.length, 0)

  return (
    <div className="space-y-4">
      {totalMissing > 0 && (
        <div className="border border-card-border rounded-xl px-4 py-3 flex items-start gap-2.5">
          <span className="material-symbols-rounded text-foreground-muted text-base mt-0.5">info</span>
          <p className="text-xs text-foreground-muted">
            <strong className="text-foreground font-medium">{totalMissing} {totalMissing === 1 ? "month" : "months"}</strong> of data missing across your accounts. Upload CSV statements to fill gaps.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {[...grouped.values()].map((group) => (
          <InstitutionGroup
            key={`${group.institutionName}::${group.provider}`}
            institutionName={group.institutionName}
            provider={group.provider}
            accounts={group.accounts}
          />
        ))}
      </div>

      <p className="text-[10px] text-foreground-muted/50 tracking-wide">
        Filled = has data &middot; Green = no activity &middot; Dashed = before connected &middot; {new Date().getUTCFullYear()} only
      </p>
    </div>
  )
}
