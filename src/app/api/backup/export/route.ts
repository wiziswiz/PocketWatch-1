/**
 * POST /api/backup/export
 * Create an encrypted .pwbackup file download.
 * Requires authentication + vault password verification.
 */

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, verifyPassword, withUserEncryption } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { exportAllTables } from "@/lib/backup/backup-export"
import { encryptBackup } from "@/lib/backup/backup-crypto"

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("B1001", "Authentication required", 401)

  let body: { password?: string }
  try {
    body = await req.json()
  } catch {
    return apiError("B1002", "Invalid request body", 400)
  }

  if (!body.password || typeof body.password !== "string") {
    return apiError("B1003", "Password is required to create a backup", 400)
  }

  // Verify vault password
  const valid = await verifyPassword(body.password, user.passwordHash)
  if (!valid) {
    return apiError("B1004", "Incorrect password", 403)
  }

  try {
    // Export within user encryption context so Layer 2 fields auto-decrypt
    const payload = await withUserEncryption(() => exportAllTables())

    // Encrypt the payload with the vault password
    const encrypted = await encryptBackup(payload, body.password)

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const filename = `pocketwatch-backup-${timestamp}.pwbackup`

    return new NextResponse(new Uint8Array(encrypted), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(encrypted.byteLength),
      },
    })
  } catch (err) {
    return apiError("B1005", "Failed to create backup", 500, err)
  }
}
