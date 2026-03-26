import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getVaultOwner } from "@/lib/auth"
import { createAuthenticationOptions, getRpConfig } from "@/lib/passkey"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const user = await getVaultOwner()
    if (!user) return apiError("E1220", "No vault configured", 400)

    const passkeys = await db.passkey.findMany({
      where: { userId: user.id },
      select: { credentialId: true },
    })

    if (passkeys.length === 0) {
      return apiError("E1221", "No passkeys registered", 400)
    }

    const rp = getRpConfig(request)
    const options = await createAuthenticationOptions(
      user.id,
      passkeys.map((p) => p.credentialId),
      rp,
    )

    return NextResponse.json(options)
  } catch (error) {
    return apiError("E1229", "Failed to generate authentication options", 500, error)
  }
}
