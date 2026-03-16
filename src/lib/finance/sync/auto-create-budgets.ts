/**
 * Auto-create budgets from spending suggestions after first sync.
 * Only runs when user has 0 budgets and at least 1 month of transaction data.
 */

import { db } from "@/lib/db"
import { computeBudgetSuggestions } from "@/lib/finance/budget-suggestions"

export async function autoCreateBudgets(userId: string): Promise<{ created: number }> {
  const existingCount = await db.financeBudget.count({ where: { userId } })
  if (existingCount > 0) return { created: 0 }

  const { suggestions } = await computeBudgetSuggestions(userId)
  if (suggestions.length === 0) return { created: 0 }

  // Only auto-create budgets for categories with meaningful spending (>$20/mo avg)
  const meaningful = suggestions.filter((s) => s.avgMonthly >= 20)
  if (meaningful.length === 0) return { created: 0 }

  let created = 0
  for (const s of meaningful) {
    await db.financeBudget.create({
      data: {
        userId,
        category: s.category,
        monthlyLimit: s.suggested,
      },
    })
    created++
  }

  console.info("[auto-create-budgets]", { userId, created, total: suggestions.length })
  return { created }
}
