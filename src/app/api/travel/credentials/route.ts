/**
 * Travel credentials CRUD — stores Roame session and SerpAPI key.
 * Reuses FinanceCredential model with services: "roame", "serpapi".
 */

import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { encryptCredential, decryptCredential } from "@/lib/finance/crypto"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod/v4"

function maskKey(key: string): string {
  if (key.length <= 8) return "****"
  return `${key.slice(0, 4)}****${key.slice(-4)}`
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiError("T2001", "Authentication required", 401)

  try {
    const credentials = await db.financeCredential.findMany({
      where: { userId: user.id, service: { in: ["roame", "serpapi", "atf", "roame_refresh"] } },
    })

    const services = await Promise.all(
      credentials.map(async (cred) => {
        const key = await decryptCredential(cred.encryptedKey)
        const displayKey = cred.service === "roame" ? "session-configured" : key
        return {
          service: cred.service,
          maskedKey: maskKey(displayKey),
          updatedAt: cred.updatedAt.toISOString(),
        }
      })
    )

    return NextResponse.json({ services })
  } catch (err) {
    return apiError("T2002", "Failed to fetch credentials", 500, err)
  }
}

const saveSchema = z.object({
  service: z.enum(["roame", "serpapi", "atf", "roame_refresh"]),
  key: z.string().min(1, "Key is required"),
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("T2010", "Authentication required", 401)

  const body = await req.json()
  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("T2011", parsed.error.issues[0]?.message ?? "Invalid request", 400)
  }

  try {
    // Normalize Roame credential: accept raw JWT or JSON with session field
    if (parsed.data.service === "roame") {
      try {
        const maybeJson = JSON.parse(parsed.data.key)
        if (typeof maybeJson === "object" && maybeJson.session) {
          // Already a JSON object with session field — keep as-is
        } else {
          return apiError("T2012", "Invalid Roame session JSON", 400)
        }
      } catch {
        // Not JSON — treat as raw session JWT, wrap in JSON
        if (parsed.data.key.startsWith("eyJ")) {
          parsed.data.key = JSON.stringify({ session: parsed.data.key })
        } else {
          return apiError("T2012", "Invalid Roame session — must be a JWT or JSON with session field", 400)
        }
      }
    }

    const encryptedKey = await encryptCredential(parsed.data.key)

    await db.financeCredential.upsert({
      where: {
        userId_service: { userId: user.id, service: parsed.data.service },
      },
      create: {
        userId: user.id,
        service: parsed.data.service,
        encryptedKey,
        encryptedSecret: encryptedKey, // Not used for travel, but required by schema
        environment: "production",
      },
      update: {
        encryptedKey,
        encryptedSecret: encryptedKey,
      },
    })

    return NextResponse.json({ saved: true, service: parsed.data.service })
  } catch (err) {
    return apiError("T2013", "Failed to save credential", 500, err)
  }
}

const deleteSchema = z.object({
  service: z.enum(["roame", "serpapi", "atf", "roame_refresh"]),
})

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("T2020", "Authentication required", 401)

  const { searchParams } = new URL(req.url)
  const service = searchParams.get("service")
  const parsed = deleteSchema.safeParse({ service })
  if (!parsed.success) {
    return apiError("T2021", "Invalid service", 400)
  }

  try {
    await db.financeCredential.deleteMany({
      where: { userId: user.id, service: parsed.data.service },
    })

    return NextResponse.json({ deleted: true })
  } catch (err) {
    return apiError("T2022", "Failed to delete credential", 500, err)
  }
}
