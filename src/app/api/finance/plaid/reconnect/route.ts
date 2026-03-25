import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { createUpdateLinkToken } from "@/lib/finance/plaid-client"
import { decryptCredential } from "@/lib/finance/crypto"
import { mapFinanceError } from "@/lib/finance/error-map"
import { syncInstitution, saveFinanceSnapshot } from "@/lib/finance/sync"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod/v4"

const bodySchema = z.object({
  institutionId: z.string().min(1),
})

/** Create an update-mode link token for reconnecting an errored Plaid item. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("F1030", "Authentication required", 401)

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return apiError("F1031", "Invalid request body", 400)

  try {
    const institution = await db.financeInstitution.findFirst({
      where: { id: parsed.data.institutionId, userId: user.id, provider: "plaid" },
      select: { id: true, institutionName: true, plaidAccessToken: true },
    })

    if (!institution || !institution.plaidAccessToken) {
      return apiError("F1032", "Institution not found or not a Plaid connection", 404)
    }

    const accessToken = await decryptCredential(institution.plaidAccessToken)
    const linkToken = await createUpdateLinkToken(user.id, accessToken)

    return NextResponse.json({
      linkToken,
      institutionId: institution.id,
      institutionName: institution.institutionName,
    })
  } catch (err) {
    const mapped = mapFinanceError(err, "Failed to create reconnect token")
    return apiError("F1033", mapped.message, mapped.status, err)
  }
}

/** Clear error state after successful Plaid Link reconnect and trigger sync. */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("F1034", "Authentication required", 401)

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return apiError("F1035", "Invalid request body", 400)

  try {
    const institution = await db.financeInstitution.findFirst({
      where: { id: parsed.data.institutionId, userId: user.id, provider: "plaid" },
    })

    if (!institution) {
      return apiError("F1036", "Institution not found", 404)
    }

    await db.financeInstitution.update({
      where: { id: institution.id },
      data: { status: "active", errorCode: null, errorMessage: null },
    })

    // Trigger sync in background
    syncInstitution(institution.id)
      .then(() => saveFinanceSnapshot(user.id))
      .catch((err: unknown) =>
        console.warn("[plaid.reconnect.sync.failed]", {
          institutionId: institution.id,
          error: err instanceof Error ? err.message : String(err),
        })
      )

    return NextResponse.json({ success: true })
  } catch (err) {
    return apiError("F1037", "Failed to complete reconnect", 500, err)
  }
}
