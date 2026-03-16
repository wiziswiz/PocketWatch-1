import { db } from "@/lib/db"
import { apiError } from "@/lib/api-error"
import { syncInstitution, fetchFullPlaidHistory, saveFinanceSnapshot } from "@/lib/finance/sync"
import { createPlaidSyncJob, hasActiveJob } from "@/lib/finance/sync/plaid-sync-jobs"
import { verifyPlaidWebhook } from "@/lib/finance/webhook-verify"
import { financeRateLimiters, getClientId, rateLimitHeaders } from "@/lib/rate-limit"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod/v4"

const webhookBodySchema = z.object({
  webhook_type: z.string().min(1).max(100),
  webhook_code: z.string().min(1).max(100),
  item_id: z.string().min(1).max(200),
  error: z.object({
    error_code: z.string(),
    error_message: z.string(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  // Rate limit webhooks
  const clientId = getClientId(req)
  const rl = financeRateLimiters.webhook(`webhook:${clientId}`)
  if (!rl.success) {
    return apiError("F1025", "Webhook rate limit exceeded", 429, undefined, rateLimitHeaders(rl))
  }

  try {
    const rawBody = await req.text()

    // Verify Plaid webhook signature (skip in development/sandbox if no key)
    const verificationHeader = req.headers.get("plaid-verification")
    if (verificationHeader) {
      const isValid = await verifyPlaidWebhook(rawBody, verificationHeader)
      if (!isValid) {
        console.warn("[finance.webhook.invalid_signature]", { ref: "F1021" })
        return apiError("F1021", "Invalid webhook signature", 401)
      }
    } else if (process.env.NODE_ENV === "production") {
      // In production, require signature
      console.warn("[finance.webhook.missing_signature]", { ref: "F1022" })
      return apiError("F1022", "Missing webhook signature", 401)
    }

    const body = JSON.parse(rawBody)
    const parsed = webhookBodySchema.safeParse(body)
    if (!parsed.success) {
      return apiError("F1023", "Invalid webhook payload", 400)
    }
    const { webhook_type, webhook_code, item_id, error } = parsed.data

    const institution = await db.financeInstitution.findFirst({
      where: { plaidItemId: item_id },
    })

    if (!institution) {
      return NextResponse.json({ received: true })
    }

    if (webhook_type === "TRANSACTIONS") {
      if (webhook_code === "SYNC_UPDATES_AVAILABLE" || webhook_code === "INITIAL_UPDATE") {
        // Incremental sync — new or initial data is available
        console.info(`[plaid.webhook.${webhook_code.toLowerCase()}]`, {
          itemId: item_id, userId: institution.userId,
        })
        syncInstitution(institution.id)
          .then(() => saveFinanceSnapshot(institution.userId))
          .catch((err: unknown) => console.warn("[plaid.webhook.sync.failed]", err instanceof Error ? err.message : String(err)))
      }

      if (webhook_code === "HISTORICAL_UPDATE") {
        // Full history is now available — trigger deep history fetch
        console.info("[plaid.webhook.historical_update]", {
          itemId: item_id, userId: institution.userId,
        })
        const active = await hasActiveJob(institution.userId, institution.id, "full_history")
        if (!active) {
          const job = await createPlaidSyncJob(institution.userId, institution.id, "full_history")
          fetchFullPlaidHistory(institution.userId, { jobId: job.id })
            .catch((err: unknown) =>
              console.warn("[plaid.webhook.historical_update.failed]", {
                jobId: job.id,
                error: err instanceof Error ? err.message : String(err),
              })
            )
        }
      }
    }

    if (webhook_type === "ITEM") {
      if (webhook_code === "ERROR") {
        await db.financeInstitution.update({
          where: { id: institution.id },
          data: {
            status: "error",
            errorCode: error?.error_code ?? null,
            errorMessage: error?.error_message ?? null,
          },
        })
      }

      if (webhook_code === "PENDING_EXPIRATION") {
        console.warn("[plaid.webhook.pending_expiration]", {
          itemId: item_id, userId: institution.userId,
        })
        await db.financeInstitution.update({
          where: { id: institution.id },
          data: { errorMessage: "Plaid connection expiring soon — please re-authenticate" },
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    return apiError("F1020", "Webhook processing failed", 500, err)
  }
}
