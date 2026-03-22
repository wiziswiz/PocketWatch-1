import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiError } from "@/lib/api-error"
import { ensureSyncStatesForUser, startOrResumeHistorySyncJob } from "@/lib/portfolio/transaction-fetcher"
import { isEvmAddress, isSolanaAddress } from "@/lib/tracker/chains"
import { EVM_CHAIN_IDS } from "@/lib/portfolio/chains"

interface ImportEntry {
  name?: string
  address?: string
  chain?: string
}

interface SkippedEntry {
  name: string
  reason: string
}

const BTC_REGEX = /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/

function isBtcAddress(address: string): boolean {
  return BTC_REGEX.test(address)
}

/** Map sheet chain column to portfolio chain IDs */
function mapChainToIds(chain: string | undefined, address: string): string[] | null {
  const normalized = (chain ?? "").trim().toUpperCase()

  // Explicit chain mappings
  if (normalized === "SOLANA" || normalized === "SOL") return ["SOL"]
  if (normalized === "BTC" || normalized === "BITCOIN") return ["BTC"]

  // EVM explicit
  if (normalized === "EVM" || normalized === "ETHEREUM" || normalized === "ETH") {
    return [...EVM_CHAIN_IDS]
  }

  // Unsupported chains
  const UNSUPPORTED = new Set([
    "APTOS", "COSMOS", "OSMO", "OSMOSIS", "SUI", "STARKNET",
    "XRP", "RIPPLE", "CARDANO", "ADA", "INJECTIVE", "INJ",
    "THORCHAIN", "THOR", "MAYA", "MAYACHAIN", "BNB BEACON",
    "TERRA", "LUNA",
  ])
  if (UNSUPPORTED.has(normalized)) return null

  // Auto-detect by address format
  if (isEvmAddress(address)) return [...EVM_CHAIN_IDS]
  if (isSolanaAddress(address)) return ["SOL"]
  if (isBtcAddress(address)) return ["BTC"]

  // Unknown chain + unrecognizable address
  return null
}

/** POST /api/portfolio/accounts/import — bulk import wallets */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("E9050", "Authentication required", 401)

  try {
    const body = await request.json()
    const entries: ImportEntry[] = Array.isArray(body?.wallets) ? body.wallets : Array.isArray(body) ? body : []

    if (entries.length === 0) {
      return apiError("E9051", "No wallets provided", 400)
    }
    if (entries.length > 500) {
      return apiError("E9052", "Too many wallets (max 500)", 400)
    }

    let imported = 0
    const skipped: SkippedEntry[] = []

    for (const entry of entries) {
      const name = (entry.name ?? "").trim()
      const address = (entry.address ?? "").trim()

      if (!address) {
        skipped.push({ name: name || "(empty)", reason: "No address" })
        continue
      }

      const chainIds = mapChainToIds(entry.chain, address)
      if (!chainIds) {
        skipped.push({ name: name || address.slice(0, 12), reason: `Unsupported chain: ${entry.chain || "unknown"}` })
        continue
      }

      await db.trackedWallet.upsert({
        where: { userId_address: { userId: user.id, address } },
        create: {
          userId: user.id,
          address,
          label: name || null,
          chains: chainIds,
        },
        update: {
          label: name || undefined,
          chains: chainIds,
        },
      })

      imported++
    }

    // Trigger sync once for all imported wallets
    if (imported > 0) {
      void (async () => {
        try {
          await ensureSyncStatesForUser(user.id)
          await startOrResumeHistorySyncJob(user.id)
          console.log(`[import] Queued sync for ${imported} imported wallets`)
        } catch (e) {
          console.warn("[import] Failed to queue sync:", e)
        }
      })()
    }

    return NextResponse.json({
      imported,
      skipped,
      total: entries.length,
    })
  } catch (error) {
    return apiError("E9053", "Failed to import wallets", 500, error)
  }
}
