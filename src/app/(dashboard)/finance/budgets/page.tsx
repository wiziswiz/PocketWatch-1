"use client"

import { useState, useMemo } from "react"
import {
  useFinanceBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget,
  useFinanceDeepInsights, useFinanceTransactions,
  useUpdateTransactionCategory,
  useBudgetSuggestions,
} from "@/hooks/use-finance"
import { FinanceCardSkeleton } from "@/components/finance/finance-loading"
import { BudgetCategoryBreakdown } from "@/components/finance/budgets/budget-category-breakdown"
import { BudgetAddModal } from "@/components/finance/budgets/budget-add-modal"
import { BudgetUntrackedSection } from "@/components/finance/budgets/budget-untracked-section"
import { BudgetRingChart } from "@/components/finance/budgets/budget-ring-chart"
import { BudgetProgressBar } from "@/components/finance/budget-progress-bar"
import { ConfirmDialog } from "@/components/finance/confirm-dialog"
import { getCategoryMeta, getBudgetableCategories } from "@/lib/finance/categories"
import { formatCurrency, cn } from "@/lib/utils"

export default function FinanceBudgetsPage() {
  const { data: budgets, isLoading, isError } = useFinanceBudgets()
  const { data: deep } = useFinanceDeepInsights()
  const { data: txData } = useFinanceTransactions({ limit: 100 })
  const { data: suggestions } = useBudgetSuggestions()
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const deleteBudget = useDeleteBudget()
  const updateCategory = useUpdateTransactionCategory()

  const [showModal, setShowModal] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formError, setFormError] = useState("")

  const totalBudgeted = budgets?.reduce((s, b) => s + b.monthlyLimit, 0) ?? 0
  const totalSpent = budgets?.reduce((s, b) => s + b.spent, 0) ?? 0
  const remaining = totalBudgeted - totalSpent
  const percentUsed = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0
  const budgetCount = budgets?.length ?? 0
  const overBudgetCount = budgets?.filter((b) => b.percentUsed > 100).length ?? 0
  const isOverBudget = percentUsed > 100

  const sortedBudgets = useMemo(
    () => [...(budgets ?? [])].sort((a, b) => b.percentUsed - a.percentUsed),
    [budgets]
  )
  // Top allocations sorted by budget size (shows WHERE you put the money)
  const topAllocations = useMemo(
    () => [...(budgets ?? [])].sort((a, b) => b.monthlyLimit - a.monthlyLimit).slice(0, 5),
    [budgets]
  )

  const defaultCategories = suggestions?.suggestions ?? []
  const budgetedCategories = useMemo(() => new Set(budgets?.map((b) => b.category) ?? []), [budgets])
  const untrackedCategories = useMemo(
    () => defaultCategories.filter((c) => !budgetedCategories.has(c.category)),
    [defaultCategories, budgetedCategories]
  )

  const txByCategory = useMemo(() => {
    const map: Record<string, NonNullable<typeof txData>["transactions"]> = {}
    for (const tx of txData?.transactions ?? []) {
      const cat = tx.category ?? "Uncategorized"
      if (!map[cat]) map[cat] = []
      map[cat].push(tx)
    }
    return map
  }, [txData])

  const currentMonth = deep?.currentMonth
    ? (() => { const [y, m] = deep.currentMonth.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }) })()
    : new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const dailyAvg = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0
  const projectedTotal = Math.round(dailyAvg * daysInMonth)
  const projectedOver = projectedTotal - totalBudgeted

  // Insights data
  const worstCategory = sortedBudgets[0]
  const worstOver = worstCategory ? worstCategory.spent - worstCategory.monthlyLimit : 0
  const underBudget = sortedBudgets.filter((b) => b.percentUsed < 100)

  const deletingBudget = budgets?.find((b) => b.id === deletingId)

  const handleCreate = () => {
    if (!newCategory) { setFormError("Select a category"); return }
    const amt = parseFloat(newAmount)
    if (!amt || amt <= 0) { setFormError("Enter a valid amount"); return }
    setFormError("")
    createBudget.mutate(
      { category: newCategory, monthlyLimit: amt },
      { onSuccess: () => { setNewCategory(""); setNewAmount(""); setShowModal(false) } }
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-foreground">Budgets</h1>
        <div className="bg-card border border-error/30 rounded-xl p-8 text-center">
          <span className="material-symbols-rounded text-error mb-2 block" style={{ fontSize: 32 }}>error</span>
          <p className="text-sm text-error">Failed to load budgets.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Budgets / {currentMonth}</h1>
          <p className={cn("text-xs font-medium mt-0.5", isOverBudget ? "text-error" : "text-success")}>
            Status: {isOverBudget ? "Over Budget" : "On Track"}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>add</span>
          Add Budget
        </button>
      </div>

      {/* ─── Hero: Ring Chart + Key Stats ─── */}
      {isLoading ? (
        <FinanceCardSkeleton />
      ) : budgetCount > 0 ? (
        <div className="bg-card rounded-2xl p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Ring Chart */}
            <div className="flex-shrink-0">
              <BudgetRingChart spent={totalSpent} limit={totalBudgeted} size={200} strokeWidth={16} />
            </div>

            {/* Key Stats — different data than the breakdown below */}
            <div className="flex-1 w-full space-y-5">
              {/* Stacked allocation bar — shows WHERE the budget goes proportionally */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted mb-2">Budget Allocation</p>
                <div className="flex h-3 rounded-full overflow-hidden bg-background-secondary">
                  {topAllocations.map((b) => {
                    const meta = getCategoryMeta(b.category)
                    const widthPct = totalBudgeted > 0 ? (b.monthlyLimit / totalBudgeted) * 100 : 0
                    return (
                      <div
                        key={b.id}
                        className="h-full transition-all duration-500"
                        style={{ width: `${widthPct}%`, backgroundColor: meta.hex, opacity: 0.8 }}
                        title={`${b.category}: ${formatCurrency(b.monthlyLimit, "USD", 0)}`}
                      />
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {topAllocations.map((b) => {
                    const meta = getCategoryMeta(b.category)
                    return (
                      <div key={b.id} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.hex }} />
                        <span className="text-[10px] text-foreground-muted">{b.category}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">Budgeted</p>
                  <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(totalBudgeted, "USD", 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">Remaining</p>
                  <p className={cn("text-lg font-bold tabular-nums", remaining >= 0 ? "text-success" : "text-error")}>
                    {formatCurrency(remaining, "USD", 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">Daily Avg</p>
                  <p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(dailyAvg, "USD", 0)}</p>
                  <p className="text-[10px] text-foreground-muted">{dayOfMonth}d tracked</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ─── Insight Cards — each tells a different story ─── */}
      {budgetCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Pace Check */}
          <div className="bg-card rounded-xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-rounded text-primary" style={{ fontSize: 16 }}>speed</span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">Pace Check</p>
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              You&apos;re spending <span className="font-bold tabular-nums">{formatCurrency(dailyAvg, "USD", 0)}/day</span>.
              At this pace you&apos;ll hit <span className="font-bold tabular-nums">{formatCurrency(projectedTotal, "USD", 0)}</span> by month end
              {projectedOver > 0 ? (
                <span className="text-error font-semibold"> — {formatCurrency(projectedOver, "USD", 0)} over budget.</span>
              ) : (
                <span className="text-success font-semibold"> — {formatCurrency(Math.abs(projectedOver), "USD", 0)} under budget.</span>
              )}
            </p>
            {/* Pace indicator */}
            <div className="mt-3 relative">
              <div className="h-1.5 bg-background-secondary rounded-full">
                <div
                  className={cn("h-full rounded-full transition-all", projectedOver > 0 ? "bg-error" : "bg-success")}
                  style={{ width: `${Math.min((dayOfMonth / daysInMonth) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-foreground-muted mt-1 tabular-nums">
                <span>Day 1</span>
                <span>Day {daysInMonth}</span>
              </div>
            </div>
          </div>

          {/* Biggest Overspend */}
          <div className="bg-card rounded-xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-rounded text-error" style={{ fontSize: 16 }}>warning</span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">Biggest Overspend</p>
            </div>
            {worstCategory && worstOver > 0 ? (
              <p className="text-xs text-foreground leading-relaxed">
                <span className="font-bold">{worstCategory.category}</span> is{" "}
                <span className="text-error font-bold tabular-nums">{formatCurrency(worstOver, "USD", 0)} over budget</span>{" "}
                ({Math.round(worstCategory.percentUsed)}%).
                {daysInMonth - dayOfMonth > 0 && (
                  <span className="text-foreground-muted"> Consider reducing by {formatCurrency(worstOver / (daysInMonth - dayOfMonth) * 7, "USD", 0)}/week.</span>
                )}
              </p>
            ) : (
              <p className="text-xs text-success font-medium">All categories are within budget!</p>
            )}
          </div>

          {/* On Track */}
          <div className="bg-card rounded-xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-rounded text-success" style={{ fontSize: 16 }}>check_circle</span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">On Track</p>
            </div>
            {underBudget.length > 0 ? (
              <p className="text-xs text-foreground leading-relaxed">
                <span className="font-bold text-success">{underBudget.length} {underBudget.length === 1 ? "category is" : "categories are"}</span> under budget:
                {" "}{underBudget.slice(0, 2).map((b) => `${b.category} (${formatCurrency(b.monthlyLimit - b.spent, "USD", 0)} left)`).join(" and ")}.
              </p>
            ) : (
              <p className="text-xs text-error font-medium">All categories are over budget.</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Empty State ─── */}
      {!isLoading && budgetCount === 0 && (
        <div className="bg-card rounded-2xl p-12 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-rounded text-primary" style={{ fontSize: 24 }}>savings</span>
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">No budgets yet</h3>
          <p className="text-sm text-foreground-muted mb-4 max-w-sm mx-auto">
            Set spending limits by category to track and control your spending.
          </p>
          <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-foreground text-background rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            Create Your First Budget
          </button>
        </div>
      )}

      {/* ─── Detailed Budget List ─── */}
      {budgetCount > 0 && (
        <BudgetCategoryBreakdown
          budgets={budgets!}
          txByCategory={txByCategory}
          onEditBudget={(id, limit) => updateBudget.mutate({ budgetId: id, monthlyLimit: limit })}
          onDeleteBudget={(id) => setDeletingId(id)}
          onCategoryChange={(txId, cat, rule) => updateCategory.mutate({ transactionId: txId, category: cat, createRule: rule })}
          onAddBudget={() => setShowModal(true)}
        />
      )}

      {/* ─── Untracked Spending ─── */}
      {budgetCount > 0 && untrackedCategories.length > 0 && (
        <BudgetUntrackedSection
          untrackedCategories={untrackedCategories}
          txByCategory={txByCategory}
          onAddBudget={(cat, limit) => createBudget.mutate({ category: cat, monthlyLimit: limit })}
          onBudgetAll={() => { for (const cat of untrackedCategories) createBudget.mutate({ category: cat.category, monthlyLimit: cat.suggested }) }}
        />
      )}

      {/* Modals */}
      {showModal && (
        <BudgetAddModal
          budgetableCategories={getBudgetableCategories()}
          existingBudgets={budgets}
          newCategory={newCategory}
          newAmount={newAmount}
          formError={formError}
          isPending={createBudget.isPending}
          onCategoryChange={setNewCategory}
          onAmountChange={setNewAmount}
          onCreate={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) deleteBudget.mutate(deletingId, { onSuccess: () => setDeletingId(null) }) }}
        title={`Delete ${deletingBudget?.category ?? ""} budget?`}
        description="This will permanently delete this budget."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteBudget.isPending}
      />
    </div>
  )
}
