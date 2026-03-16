import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiError } from "@/lib/api-error"

/**
 * POST /api/finance/wipe
 * Wipe all derived/cached finance data for the user.
 * Preserves connections (FinanceInstitution, FinanceAccount) and transactions
 * that cascade from them — only wipes user-created and aggregate data that
 * would otherwise persist after institutions are disconnected.
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return apiError("F9090", "Authentication required", 401)

  try {
    const [budgets, snapshots, subscriptions, streams, cards, categoryRules] = await Promise.all([
      db.financeBudget.deleteMany({ where: { userId: user.id } }),
      db.financeSnapshot.deleteMany({ where: { userId: user.id } }),
      db.financeSubscription.deleteMany({ where: { userId: user.id } }),
      db.financeRecurringStream.deleteMany({ where: { userId: user.id } }),
      db.creditCardProfile.deleteMany({ where: { userId: user.id } }),
      db.financeCategoryRule.deleteMany({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      success: true,
      purged: {
        budgets: budgets.count,
        snapshots: snapshots.count,
        subscriptions: subscriptions.count,
        recurringStreams: streams.count,
        creditCardProfiles: cards.count,
        categoryRules: categoryRules.count,
      },
    })
  } catch (error) {
    return apiError("F9091", "Failed to wipe finance data", 500, error)
  }
}
