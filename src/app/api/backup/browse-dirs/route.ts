/**
 * GET /api/backup/browse-dirs?path=~/.pocketwatch/backups
 * List directories at a given path for the backup folder picker.
 */

import { NextRequest, NextResponse } from "next/server"
import { readdir, mkdir, lstat } from "node:fs/promises"
import { resolve, dirname, sep } from "node:path"
import { homedir } from "node:os"
import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"

const MAX_ENTRIES = 200

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("B5001", "Authentication required", 401)

  const rawPath = req.nextUrl.searchParams.get("path") || "~"
  const showHidden = req.nextUrl.searchParams.get("showHidden") === "true"
  const createDir = req.nextUrl.searchParams.get("create") === "true"

  const home = homedir()
  const expanded = rawPath.replace(/^~/, home)
  const resolvedDir = resolve(expanded)

  // Security: must be within home directory
  if (!resolvedDir.startsWith(home + sep) && resolvedDir !== home) {
    return apiError("B5002", "Path must be within home directory", 403)
  }

  // Optionally create the directory
  if (createDir) {
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

  // Compact the path for display (replace home with ~)
  const displayPath = resolvedDir.startsWith(home)
    ? "~" + resolvedDir.slice(home.length)
    : resolvedDir

  const parentDir = resolvedDir === home
    ? null
    : dirname(resolvedDir).startsWith(home)
      ? "~" + dirname(resolvedDir).slice(home.length) || "~"
      : null

  try {
    const entries = await readdir(resolvedDir, { withFileTypes: true })
    const dirs = entries
      .filter((e) => e.isDirectory() && (showHidden || !e.name.startsWith(".")))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_ENTRIES)
      .map((e) => ({ name: e.name }))

    return NextResponse.json({ current: displayPath, parent: parentDir, dirs })
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "ENOENT") {
      return NextResponse.json({ current: displayPath, parent: parentDir, dirs: [], notFound: true })
    }
    if (code === "EACCES") {
      return apiError("B5004", "Permission denied", 403)
    }
    return apiError("B5005", "Failed to list directory", 500, err)
  }
}
