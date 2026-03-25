/**
 * Export all PocketWatch data into a backup payload.
 * Queries every table via Prisma and bundles with encryption secrets.
 */

import { db } from "@/lib/db"
import { BACKUP_TABLES, getModelDelegate } from "./backup-tables"

const BACKUP_FORMAT_VERSION = 1
const CHUNK_SIZE = 5000

export interface BackupPayload {
  version: number
  createdAt: string
  appUrl: string | null
  secrets: {
    ENCRYPTION_KEY: string | null
    FINANCE_ENCRYPTION_KEY: string | null
  }
  stats: { totalRecords: number; tableCount: number }
  tables: Record<string, unknown[]>
}

/**
 * Export all tables into a BackupPayload.
 * Layer 2 fields are auto-decrypted by the Prisma extension (plaintext in payload).
 * Layer 3 fields stay as ciphertext (encrypted by finance/crypto.ts, not Prisma).
 */
export async function exportAllTables(): Promise<BackupPayload> {
  const tables: Record<string, unknown[]> = {}
  let totalRecords = 0
  let tableCount = 0

  for (const table of BACKUP_TABLES) {
    const delegate = getModelDelegate(db, table.name)
    if (!delegate?.findMany) continue

    // Paginate to avoid memory spikes on large tables
    const records: unknown[] = []
    let cursor: string | undefined
    let batch: Array<{ id: string }>

    do {
      batch = await delegate.findMany({
        take: CHUNK_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      })
      records.push(...batch)
      if (batch.length > 0) {
        cursor = batch[batch.length - 1].id
      }
    } while (batch.length === CHUNK_SIZE)

    if (records.length > 0) {
      tables[table.name] = records
      totalRecords += records.length
      tableCount++
    }
  }

  return {
    version: BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    secrets: {
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? null,
      FINANCE_ENCRYPTION_KEY: process.env.FINANCE_ENCRYPTION_KEY ?? null,
    },
    stats: { totalRecords, tableCount },
    tables,
  }
}
