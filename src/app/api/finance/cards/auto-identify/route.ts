import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { autoIdentifyCards } from "@/lib/finance/sync/auto-identify-cards"
import { NextResponse } from "next/server"

/**
 * POST: Auto-identify unidentified credit cards using AI + available signals.
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return apiError("CI01", "Authentication required", 401)

  try {
    const result = await autoIdentifyCards(user.id)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Card identification failed"
    return apiError("CI09", message, 500)
  }
}
