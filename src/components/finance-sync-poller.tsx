"use client"

import { useEffect, useRef } from "react"
import { financeFetch } from "@/hooks/finance/shared"
import { useQueryClient } from "@tanstack/react-query"

const SYNC_INTERVAL_MS = 15 * 60_000 // 15 minutes
const STALE_THRESHOLD_MS = 10 * 60_000 // Skip if synced within 10 min

/**
 * Invisible component that auto-syncs all finance data (Plaid + SimpleFIN + investments)
 * every 15 minutes in the background. Skips if recently synced manually.
 * Mount once in the dashboard layout.
 */
export function FinanceSyncPoller() {
  const qc = useQueryClient()
  const syncingRef = useRef(false)
  const lastSyncRef = useRef(0)

  useEffect(() => {
    const sync = async () => {
      if (syncingRef.current) return
      // Skip if recently synced (manual or auto)
      if (Date.now() - lastSyncRef.current < STALE_THRESHOLD_MS) return

      syncingRef.current = true
      try {
        // Use the unified resync endpoint which syncs Plaid + SimpleFIN + investments
        await financeFetch("/plaid/resync", { method: "POST", timeoutMs: 120_000 })
        lastSyncRef.current = Date.now()
        qc.invalidateQueries({ queryKey: ["finance"] })
      } catch {
        // Silent — background sync shouldn't disturb the user
      } finally {
        syncingRef.current = false
      }
    }

    const interval = setInterval(sync, SYNC_INTERVAL_MS)
    // Initial sync after 30s delay to avoid blocking page load
    const initialTimeout = setTimeout(sync, 30_000)

    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [qc])

  return null
}
