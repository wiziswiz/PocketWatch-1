/**
 * POST /api/backup/browse-dirs
 * Opens the native macOS folder picker via osascript and returns the selected path.
 * Also supports direct path validation via { action: "validate", path: "~/..." }.
 */

import { NextRequest, NextResponse } from "next/server"
import { resolve, sep } from "node:path"
import { homedir } from "node:os"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { mkdir, lstat } from "node:fs/promises"
import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"

const execFileAsync = promisify(execFile)

function toDisplay(absPath: string, home: string): string {
  return absPath.startsWith(home) ? "~" + absPath.slice(home.length) : absPath
}

function isWithinHome(absPath: string, home: string): boolean {
  return absPath.startsWith(home + sep) || absPath === home
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("B5001", "Authentication required", 401)

  let body: { action?: string; path?: string; create?: boolean; defaultPath?: string }
  try { body = await req.json() } catch { return apiError("B5003", "Invalid request body", 400) }

  const home = homedir()

  // Mode 1: Open native folder picker
  if (body.action === "pick") {
    const defaultDir = (body.defaultPath ?? "~").replace(/^~/, home)
    const resolvedDefault = resolve(defaultDir)

    try {
      const script = [
        `set defaultFolder to POSIX file "${resolvedDefault}"`,
        `try`,
        `  set theFolder to POSIX path of (choose folder with prompt "Select backup folder" default location defaultFolder)`,
        `on error`,
        `  set theFolder to POSIX path of (choose folder with prompt "Select backup folder")`,
        `end try`,
        `return theFolder`,
      ].join("\n")

      const { stdout } = await execFileAsync("osascript", ["-e", script], { timeout: 120_000 })
      const selected = stdout.trim().replace(/\/$/, "")

      if (!selected) return NextResponse.json({ cancelled: true })

      const resolvedSelected = resolve(selected)
      if (!isWithinHome(resolvedSelected, home)) {
        return apiError("B5002", "Selected folder must be within your home directory", 403)
      }

      return NextResponse.json({ path: toDisplay(resolvedSelected, home), cancelled: false })
    } catch (err: unknown) {
      const exitCode = (err as { code?: number }).code
      const stderr = (err as { stderr?: string }).stderr ?? ""
      const msg = (err as Error).message ?? ""
      console.error("[browse-dirs] osascript error:", { exitCode, stderr, msg })
      // osascript exit code 1 = user cancelled
      if (exitCode === 1 || stderr.includes("User canceled")) {
        return NextResponse.json({ cancelled: true })
      }
      return apiError("B5005", `Folder picker failed: ${stderr || msg}`, 500)
    }
  }

  // Mode 2: Validate / create path directly
  const rawPath = typeof body.path === "string" ? body.path : "~"
  const expanded = rawPath.replace(/^~/, home)
  const resolvedDir = resolve(expanded)

  if (!isWithinHome(resolvedDir, home)) return apiError("B5002", "Path must be within home directory", 403)

  if (body.create) {
    try {
      await mkdir(resolvedDir, { recursive: true })
      const stat = await lstat(resolvedDir)
      if (!stat.isDirectory() || stat.isSymbolicLink()) return apiError("B5006", "Invalid directory target", 400)
    } catch { return apiError("B5003", "Failed to create directory", 500) }
  }

  let exists = false
  try { const s = await lstat(resolvedDir); exists = s.isDirectory() && !s.isSymbolicLink() } catch {}

  return NextResponse.json({ path: toDisplay(resolvedDir, home), exists })
}
