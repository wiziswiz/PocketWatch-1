/**
 * PlaidSyncJob CRUD — tracks background Plaid sync tasks with retry support.
 */

import { db } from "@/lib/db"

export type PlaidSyncJobType = "full_history" | "incremental_sync" | "product_sync"

interface JobStats {
  fetched: number
  inserted: number
}

const BACKOFF_MINUTES = [5, 15, 45]

export async function createPlaidSyncJob(
  userId: string,
  institutionId: string,
  jobType: PlaidSyncJobType,
) {
  return db.plaidSyncJob.create({
    data: {
      userId,
      institutionId,
      jobType,
      status: "queued",
      attempt: 0,
      maxAttempts: 3,
    },
  })
}

export async function markJobRunning(jobId: string) {
  return db.plaidSyncJob.update({
    where: { id: jobId },
    data: {
      status: "running",
      attempt: { increment: 1 },
      startedAt: new Date(),
      error: null,
    },
  })
}

export async function markJobCompleted(jobId: string, stats: JobStats) {
  return db.plaidSyncJob.update({
    where: { id: jobId },
    data: {
      status: "completed",
      transactionsFetched: stats.fetched,
      transactionsInserted: stats.inserted,
      completedAt: new Date(),
      error: null,
    },
  })
}

export async function markJobFailed(jobId: string, errorMessage: string) {
  return db.$transaction(async (tx) => {
    const job = await tx.plaidSyncJob.findUnique({
      where: { id: jobId },
      select: { attempt: true, maxAttempts: true, status: true },
    })

    if (!job) return null

    const canRetry = job.attempt < job.maxAttempts
    const backoffIndex = Math.min(job.attempt, BACKOFF_MINUTES.length - 1)
    const nextRetry = canRetry
      ? new Date(Date.now() + BACKOFF_MINUTES[backoffIndex] * 60_000)
      : null

    return tx.plaidSyncJob.update({
      where: { id: jobId },
      data: {
        status: canRetry ? "queued" : "failed",
        error: errorMessage,
        completedAt: canRetry ? null : new Date(),
        nextRetryAt: nextRetry,
      },
    })
  })
}

/**
 * Atomically claim retryable jobs by setting status to "running".
 * Returns only jobs this caller successfully claimed (prevents concurrent workers
 * from processing the same job).
 */
export async function claimRetryableJobs() {
  const candidates = await db.plaidSyncJob.findMany({
    where: {
      status: "queued",
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: new Date() } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { id: true },
  })

  if (candidates.length === 0) return []

  // Atomically claim by setting status="running" only for still-queued jobs
  await db.plaidSyncJob.updateMany({
    where: {
      id: { in: candidates.map((c) => c.id) },
      status: "queued",
    },
    data: {
      status: "running",
      startedAt: new Date(),
    },
  })

  // Return the ones we successfully claimed
  return db.plaidSyncJob.findMany({
    where: {
      id: { in: candidates.map((c) => c.id) },
      status: "running",
    },
  })
}

export async function hasActiveJob(
  userId: string,
  institutionId: string,
  jobType: PlaidSyncJobType,
): Promise<boolean> {
  const count = await db.plaidSyncJob.count({
    where: {
      userId,
      institutionId,
      jobType,
      status: { in: ["queued", "running"] },
    },
  })
  return count > 0
}

export async function getPendingJobsForUser(userId: string) {
  return db.plaidSyncJob.findMany({
    where: {
      userId,
      status: { in: ["queued", "running"] },
    },
    select: {
      id: true,
      institutionId: true,
      jobType: true,
      status: true,
      attempt: true,
      maxAttempts: true,
      error: true,
      startedAt: true,
      nextRetryAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getRecentJobsForUser(userId: string, limit = 10) {
  return db.plaidSyncJob.findMany({
    where: {
      userId,
      status: { in: ["completed", "failed"] },
    },
    select: {
      id: true,
      institutionId: true,
      jobType: true,
      status: true,
      attempt: true,
      transactionsFetched: true,
      transactionsInserted: true,
      error: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  })
}
