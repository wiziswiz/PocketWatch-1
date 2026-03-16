/**
 * Local background sync daemon.
 * Replaces Vercel cron for local-only operation.
 *
 * Usage: npx tsx scripts/local-sync-daemon.ts
 *
 * Calls the sync-worker endpoint every 60 seconds.
 * Run in a separate terminal tab alongside `npm run dev`.
 */
import "dotenv/config"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
const SYNC_ENDPOINT = `${BASE_URL}/api/internal/history/sync-worker`
const SNAPSHOT_ENDPOINT = `${BASE_URL}/api/internal/snapshot-worker`
const SYNC_SECRET = process.env.HISTORY_CRON_SECRET ?? process.env.CRON_SECRET ?? "dev-local-secret"
const SNAPSHOT_SECRET = process.env.SNAPSHOT_WORKER_SECRET ?? process.env.CRON_SECRET ?? "dev-local-secret"
const INTERVAL_MS = 60_000
const SNAPSHOT_INTERVAL_MS = 60 * 60_000 // every hour

async function snapshotTick() {
  const now = new Date().toISOString().slice(11, 19)
  try {
    const res = await fetch(SNAPSHOT_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${SNAPSHOT_SECRET}` },
    })
    if (!res.ok) {
      console.log(`[${now}] snapshot-worker returned ${res.status}`)
      return
    }
    const data = await res.json()
    console.log(`[${now}] snapshot: ${data.completed ?? 0}/${data.processed ?? 0} users`)
  } catch (err) {
    console.log(`[${now}] snapshot fetch failed: ${err instanceof Error ? err.message : err}`)
  }
}

async function tick() {
  const now = new Date().toISOString().slice(11, 19)
  try {
    const res = await fetch(SYNC_ENDPOINT, {
      method: "GET",
      headers: { Authorization: `Bearer ${SYNC_SECRET}` },
    })

    if (!res.ok) {
      console.log(`[${now}] sync-worker returned ${res.status}: ${await res.text().catch(() => "")}`)
      return
    }

    const data = await res.json()
    const results = data.results ?? []
    const summary = results.map((r: Record<string, unknown>) =>
      `${r.ok ? "ok" : "ERR"} status=${r.status} tx=${r.insertedTxCount ?? 0} snaps=${(r.reconstruction as Record<string, unknown>)?.snapshotsCreated ?? "-"}`
    ).join(", ")

    if (results.length === 0) {
      console.log(`[${now}] no active sync jobs`)
    } else {
      console.log(`[${now}] processed ${data.processed} user(s): ${summary}`)
    }
  } catch (err) {
    console.log(`[${now}] fetch failed: ${err instanceof Error ? err.message : err}`)
  }
}

console.log(`Local sync daemon started`)
console.log(`  History sync: every ${INTERVAL_MS / 1000}s`)
console.log(`  Snapshots: every ${SNAPSHOT_INTERVAL_MS / 60000}min`)
console.log("Press Ctrl+C to stop\n")

// Run immediately, then on interval
tick()
snapshotTick()
setInterval(tick, INTERVAL_MS)
setInterval(snapshotTick, SNAPSHOT_INTERVAL_MS)
