import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { syncAllPlaidData } from "@/lib/finance/plaid-data-sync"
import { syncAllInstitutions, fetchFullPlaidHistory } from "@/lib/finance/sync"
import { createPlaidSyncJob, hasActiveJob } from "@/lib/finance/sync/plaid-sync-jobs"
import { autoDetectCreditCards } from "@/lib/finance/sync/auto-detect-cards"
import { autoIdentifyCards } from "@/lib/finance/sync/auto-identify-cards"
import { financeRateLimiters, rateLimitHeaders } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return apiError("FPR10", "Authentication required", 401)

  const rl = financeRateLimiters.sync(`sync:${user.id}`)
  if (!rl.success) {
    return apiError("FPR12", "Rate limit exceeded. Try again later.", 429, undefined, rateLimitHeaders(rl))
  }

  try {
    // 1. Incremental transaction sync for all institutions
    const syncResults = await syncAllInstitutions(user.id)

    // 2. Product sync (identity, liabilities, investments, recurring)
    const productReport = await syncAllPlaidData(user.id)

    // 3. Trigger full history re-fetch in background (tracked per user)
    const firstInst = await db.financeInstitution.findFirst({
      where: { userId: user.id, provider: "plaid", status: "active" },
      select: { id: true },
    })

    let historyJobId: string | null = null
    if (firstInst) {
      const active = await hasActiveJob(user.id, firstInst.id, "full_history")
      if (!active) {
        const job = await createPlaidSyncJob(user.id, firstInst.id, "full_history")
        historyJobId = job.id
        fetchFullPlaidHistory(user.id, { jobId: job.id }).catch((err) =>
          console.warn("[plaid.resync.history.failed]", {
            userId: user.id, jobId: job.id,
            error: err instanceof Error ? err.message : String(err),
          })
        )
      }
    }

    // 4. Auto-detect + identify cards in background
    autoDetectCreditCards(user.id)
      .then(() => autoIdentifyCards(user.id))
      .catch((err) => console.warn("[plaid.resync.cards.failed]", { error: err instanceof Error ? err.message : String(err) }))

    return NextResponse.json({
      syncResults,
      productReport,
      backgroundHistoryJobId: historyJobId,
    })
  } catch (err) {
    return apiError("FPR11", "Failed to sync Plaid data", 500, err)
  }
}
