import { NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { isVaultInitialized, getVaultOwner } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const initialized = await isVaultInitialized()

    let hasPasskeys = false
    if (initialized) {
      const owner = await getVaultOwner()
      if (owner) {
        const count = await db.passkey.count({ where: { userId: owner.id } })
        hasPasskeys = count > 0
      }
    }

    return NextResponse.json({ initialized, hasPasskeys })
  } catch (error) {
    return apiError("E1050", "Failed to check vault status", 500, error)
  }
}
