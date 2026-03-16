import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { exchangePublicToken, getAccounts, getInstitution, removeItem } from "@/lib/finance/plaid-client"
import { encryptCredential } from "@/lib/finance/crypto"
import { mapFinanceError } from "@/lib/finance/error-map"
import { syncInstitution, fetchFullPlaidHistory, saveFinanceSnapshot, backfillHistoricalSnapshots } from "@/lib/finance/sync"
import { syncAllPlaidData } from "@/lib/finance/plaid-data-sync"
import { createPlaidSyncJob, markJobCompleted, markJobFailed } from "@/lib/finance/sync/plaid-sync-jobs"
import { autoDetectCreditCards } from "@/lib/finance/sync/auto-detect-cards"
import { autoCreateBudgets } from "@/lib/finance/sync/auto-create-budgets"
import { autoIdentifyCards } from "@/lib/finance/sync/auto-identify-cards"
import { resolveInstitutionLogo } from "@/lib/finance/institution-logos"
import { mapPlaidType, isBizAccount, bestAccountName } from "@/lib/finance/plaid-account-classify"
import { financeRateLimiters, rateLimitHeaders } from "@/lib/rate-limit"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod/v4"

const schema = z.object({
  publicToken: z.string().min(1),
  institutionId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("F1010", "Authentication required", 401)

  const rl = financeRateLimiters.exchange(`exchange:${user.id}`)
  if (!rl.success) {
    return apiError("F1015", "Rate limit exceeded. Try again later.", 429, undefined, rateLimitHeaders(rl))
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError("F1011", "Invalid request body", 400)

  try {
    console.info("[plaid.exchange.start]", { userId: user.id, institutionId: parsed.data.institutionId })
    const { accessToken, itemId } = await exchangePublicToken(user.id, parsed.data.publicToken)
    const encryptedToken = await encryptCredential(accessToken)

    // Get institution info
    const instInfo = await getInstitution(user.id, parsed.data.institutionId)

    // Reject duplicate — only if the exact same Plaid item is already connected
    // (same institution name is allowed for business + personal accounts)
    const existingItem = await db.financeInstitution.findFirst({
      where: { userId: user.id, provider: "plaid", plaidItemId: itemId },
    })
    if (existingItem) {
      try { await removeItem(user.id, accessToken) } catch { /* best effort */ }
      return apiError("F1016", `${instInfo.name} is already connected`, 409)
    }

    // Fetch accounts first to detect business vs personal
    const plaidAccounts = await getAccounts(user.id, accessToken)
    const hasBizAccounts = plaidAccounts.some((pa) =>
      isBizAccount(pa.subtype, pa.name)
    )

    // Resolve institution logo with fallback chain
    const resolvedLogo = resolveInstitutionLogo(
      instInfo.logo,
      parsed.data.institutionId,
      instInfo.name
    )

    // Create institution record
    const displayName = hasBizAccounts ? `${instInfo.name} (Business)` : instInfo.name
    const institution = await db.financeInstitution.create({
      data: {
        userId: user.id,
        provider: "plaid",
        institutionName: displayName,
        institutionLogo: resolvedLogo,
        plaidItemId: itemId,
        plaidAccessToken: encryptedToken,
        isBusiness: hasBizAccounts,
        status: "active",
      },
    })

    // Create accounts
    for (const pa of plaidAccounts) {
      const mappedType = mapPlaidType(pa.type, pa.subtype, pa.name)
      await db.financeAccount.create({
        data: {
          userId: user.id,
          institutionId: institution.id,
          externalId: pa.accountId,
          name: bestAccountName(pa.name, pa.officialName, pa.type, pa.mask),
          officialName: pa.officialName,
          type: mappedType,
          subtype: pa.subtype,
          mask: pa.mask,
          currentBalance: pa.balances.current,
          availableBalance: pa.balances.available,
          creditLimit: pa.balances.limit,
          currency: pa.balances.isoCurrencyCode ?? "USD",
        },
      })
    }

    // Await initial sync so the client gets feedback
    let syncStatus: { transactionsAdded: number; error: string | null } = {
      transactionsAdded: 0,
      error: null,
    }
    try {
      const syncResult = await syncInstitution(institution.id)
      syncStatus = {
        transactionsAdded: syncResult.transactionsAdded,
        error: syncResult.error,
      }
      // Create net worth snapshots from synced data
      await saveFinanceSnapshot(user.id)
      await backfillHistoricalSnapshots(user.id)
    } catch (syncErr) {
      syncStatus.error = syncErr instanceof Error ? syncErr.message : "Sync failed"
    }

    // Kick off deep history fetch + comprehensive data sync in background (tracked)
    const historyJob = await createPlaidSyncJob(user.id, institution.id, "full_history")
    const productJob = await createPlaidSyncJob(user.id, institution.id, "product_sync")

    fetchFullPlaidHistory(user.id, { jobId: historyJob.id }).catch((err) =>
      console.warn("[finance.plaid.exchange.deepHistory.failed]", {
        userId: user.id,
        jobId: historyJob.id,
        error: err instanceof Error ? err.message : String(err),
      })
    )
    syncAllPlaidData(user.id)
      .then(() => markJobCompleted(productJob.id, { fetched: 0, inserted: 0 }))
      .catch(async (err) => {
        console.warn("[finance.plaid.exchange.comprehensiveSync.failed]", {
          userId: user.id,
          jobId: productJob.id,
          error: err instanceof Error ? err.message : String(err),
        })
        await markJobFailed(productJob.id, err instanceof Error ? err.message : String(err))
      })

    // Auto-detect credit cards + auto-create budgets (fire-and-forget)
    Promise.all([
      autoDetectCreditCards(user.id),
      autoCreateBudgets(user.id),
    ]).then(() => autoIdentifyCards(user.id)).catch((err) =>
      console.warn("[finance.plaid.exchange.postSync.failed]", {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      })
    )

    console.info("[plaid.exchange.success]", { userId: user.id, institutionId: institution.id, isBusiness: hasBizAccounts })

    return NextResponse.json({
      institutionId: institution.id,
      institutionName: instInfo.name,
      accountCount: plaidAccounts.length,
      syncStatus,
      backgroundJobs: {
        historyJobId: historyJob.id,
        productJobId: productJob.id,
      },
    })
  } catch (err) {
    console.warn("[finance.plaid.exchange.failed]", {
      ref: "F1012",
      userId: user.id,
      provider: "plaid",
      verifyCode: "n/a",
      institutionId: parsed.data.institutionId,
    })
    const mapped = mapFinanceError(err, "Failed to connect bank")
    return apiError("F1012", mapped.message, mapped.status, err)
  }
}

