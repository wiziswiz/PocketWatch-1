/**
 * POST /api/backup/browse-dirs
 * Validate and optionally create a backup directory.
 * Returns the resolved display path and whether it exists.
 */

import { NextRequest, NextResponse } from "next/server"
import { resolve, sep } from "node:path"
import { homedir } from "node:os"
import { mkdir, lstat } from "node:fs/promises"
import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("B5001", "Authentication required", 401)

  let body: { path?: string; create?: boolean }
  try {
    body = await req.json()
  } catch {
    return apiError("B5003", "Invalid request body", 400)
  }

  const rawPath = typeof body.path === "string" ? body.path : "~"
  const home = homedir()
  const expanded = rawPath.replace(/^~/, home)
  const resolvedDir = resolve(expanded)

  // Security: must be within home directory
  if (!resolvedDir.startsWith(home + sep) && resolvedDir !== home) {
    return apiError("B5002", "Path must be within home directory", 403)
  }

  const displayPath = resolvedDir.startsWith(home)
    ? "~" + resolvedDir.slice(home.length)
    : resolvedDir

  // Optionally create
  if (body.create) {
    try {
      await mkdir(resolvedDir, { recursive: true })
      const stat = await lstat(resolvedDir)
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        return apiError("B5006", "Invalid directory target", 400)
      }
    } catch {
      return apiError("B5003", "Failed to create directory", 500)
    }
  }

  // Check existence
  let exists = false
  try {
    const stat = await lstat(resolvedDir)
    exists = stat.isDirectory() && !stat.isSymbolicLink()
  } catch { /* doesn't exist */ }

  return NextResponse.json({ path: displayPath, exists })
}
