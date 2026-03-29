"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useCreateManualAccount } from "@/hooks/finance/use-statements"
import type { FilenameMetadata } from "@/lib/finance/statement-filename-parser"
import type { AccountCoverage } from "@/lib/finance/statement-types"

interface Props {
  accounts: AccountCoverage[]
  meta: FilenameMetadata | null
  selectedAccountId: string | null
  onAccountSelected: (id: string, name: string) => void
  disabled?: boolean
}

function matchScore(account: AccountCoverage, meta: FilenameMetadata): number {
  let score = 0
  if (meta.bank) {
    const bankLower = meta.bank.toLowerCase()
    const instLower = account.institutionName.toLowerCase()
    const acctLower = account.accountName.toLowerCase()
    // Word-boundary match: "chase" matches "Chase" or "Chase Bank" but not "purchase chased"
    const bankPattern = new RegExp(`\\b${bankLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
    if (bankPattern.test(instLower)) score += 2
    else if (bankPattern.test(acctLower)) score += 1
  }
  if (meta.mask && account.mask === meta.mask) score += 3
  return score
}

export function UploadAccountStep({ accounts, meta, selectedAccountId, onAccountSelected, disabled }: Props) {
  const [mode, setMode] = useState<"suggestion" | "picker" | "create">("suggestion")
  const [search, setSearch] = useState("")
  const [formName, setFormName] = useState("")
  const [formMask, setFormMask] = useState("")
  const [formType, setFormType] = useState<string>("credit")
  const createAccount = useCreateManualAccount()

  // Re-seed form fields when file metadata changes (e.g., user drops a different file)
  useEffect(() => {
    const typeSuffix = meta?.type === "credit" ? "Card" : meta?.type === "checking" ? "Checking" : meta?.type === "savings" ? "Savings" : "Account"
    setFormName(meta?.bank ? `${meta.bank} ${typeSuffix}` : "")
    setFormMask(meta?.mask ?? "")
    setFormType(meta?.type ?? "credit")
  }, [meta])

  // Find best matching account
  const bestMatch = useMemo(() => {
    if (!meta?.bank && !meta?.mask) return null
    let best: AccountCoverage | null = null
    let bestScore = 0
    for (const acct of accounts) {
      const s = matchScore(acct, meta)
      if (s > bestScore) { best = acct; bestScore = s }
    }
    return bestScore >= 2 ? best : null
  }, [accounts, meta])

  // Determine initial mode
  const effectiveMode = useMemo(() => {
    if (selectedAccountId) return "suggestion" // already selected, show compact
    if (bestMatch) return "suggestion"
    if (meta?.bank) return "create"
    return "picker"
  }, [selectedAccountId, bestMatch, meta])

  const activeMode = selectedAccountId ? "suggestion" : mode === "suggestion" ? effectiveMode : mode

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts
    const q = search.toLowerCase()
    return accounts.filter((a) =>
      a.institutionName.toLowerCase().includes(q) ||
      a.accountName.toLowerCase().includes(q) ||
      (a.mask && a.mask.includes(q))
    )
  }, [accounts, search])

  const handleCreate = () => {
    if (!formName.trim()) return
    createAccount.mutate(
      { name: formName.trim(), mask: formMask.trim() || undefined, type: formType },
      {
        onSuccess: (res) => {
          onAccountSelected(res.id, res.name)
          toast.success(`Created ${res.name}`)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  // Already selected — compact display
  if (selectedAccountId) {
    const acct = accounts.find((a) => a.accountId === selectedAccountId)
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/20">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-success" style={{ fontSize: 18 }}>check_circle</span>
          <span className="text-sm font-medium">
            {acct ? `${acct.institutionName} — ${acct.accountName}` : formName}
            {(acct?.mask || formMask) && <span className="text-foreground-muted"> (****{acct?.mask ?? formMask})</span>}
          </span>
        </div>
        {!disabled && (
          <button
            onClick={() => { setMode("picker"); onAccountSelected("", "") }}
            className="text-[11px] text-foreground-muted hover:text-foreground transition-colors"
          >
            Change
          </button>
        )}
      </div>
    )
  }

  // Mode A: Auto-match suggestion
  if (activeMode === "suggestion" && bestMatch) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground-muted">Account</p>
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5">
          <p className="text-xs text-foreground-muted mb-1">Looks like this is for:</p>
          <p className="text-sm font-medium">
            {bestMatch.institutionName} — {bestMatch.accountName}
            {bestMatch.mask && <span className="text-foreground-muted"> (****{bestMatch.mask})</span>}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onAccountSelected(bestMatch.accountId, bestMatch.accountName)}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Use This Account
            </button>
            <button onClick={() => setMode("picker")} className="btn-ghost text-xs px-3 py-1.5">
              Pick Different
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Mode B: Bank detected, no match — show create form
  if (activeMode === "create") {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground-muted">Account</p>
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
          <p className="text-xs text-foreground-muted">
            No <strong>{meta?.bank ?? ""}</strong> account found. Create one?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] text-foreground-muted mb-1">Account Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Kast Card"
                className="w-full bg-transparent border border-card-border rounded-lg py-2 px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] text-foreground-muted mb-1">Last 4 Digits</label>
              <input
                type="text"
                value={formMask}
                onChange={(e) => setFormMask(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="2940"
                maxLength={4}
                className="w-full bg-transparent border border-card-border rounded-lg py-2 px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] text-foreground-muted mb-1">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full bg-transparent border border-card-border rounded-lg py-2 px-3 text-sm outline-none focus:border-primary appearance-none cursor-pointer"
              >
                <option value="credit" className="bg-card">Credit / Debit Card</option>
                <option value="checking" className="bg-card">Checking</option>
                <option value="savings" className="bg-card">Savings</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={!formName.trim() || createAccount.isPending}
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
            >
              {createAccount.isPending ? "Creating..." : "Create & Continue"}
            </button>
            <button onClick={() => setMode("picker")} className="btn-ghost text-xs px-3 py-1.5">
              Pick Existing
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Mode C: Searchable picker
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground-muted">Which account is this from?</p>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search accounts..."
        className="w-full bg-transparent border border-card-border rounded-lg py-2 px-3 text-sm outline-none focus:border-primary"
      />
      <div className="border border-card-border rounded-xl overflow-hidden max-h-[240px] overflow-y-auto">
        {filteredAccounts.map((acct) => (
          <button
            key={acct.accountId}
            onClick={() => onAccountSelected(acct.accountId, acct.accountName)}
            className="w-full text-left px-3 py-2.5 hover:bg-foreground/[0.03] transition-colors border-b border-card-border/50 last:border-b-0"
          >
            <span className="text-sm font-medium">{acct.institutionName}</span>
            <span className="text-sm text-foreground-muted"> — {acct.accountName}</span>
            {acct.mask && <span className="text-xs text-foreground-muted"> (****{acct.mask})</span>}
            <span className={cn(
              "ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium",
              acct.type === "credit" ? "bg-red-500/10 text-red-500"
                : acct.type === "checking" ? "bg-blue-500/10 text-blue-500"
                : acct.type === "savings" ? "bg-green-500/10 text-green-500"
                : "bg-foreground/5 text-foreground-muted"
            )}>
              {acct.type}
            </span>
          </button>
        ))}
        {filteredAccounts.length === 0 && (
          <p className="px-3 py-4 text-xs text-foreground-muted text-center">No matching accounts</p>
        )}
      </div>
      <button
        onClick={() => setMode("create")}
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors mt-1"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 14 }}>add</span>
        Create new account
      </button>
    </div>
  )
}
