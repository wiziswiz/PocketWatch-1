import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import type { AccountCoverage } from "@/lib/finance/statement-types"

function monthKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function generateExpectedMonths(start: Date, end: Date): string[] {
  const months: string[] = []
  let y = start.getUTCFullYear()
  let m = start.getUTCMonth()
  const endY = end.getUTCFullYear()
  const endM = end.getUTCMonth()

  while (y < endY || (y === endY && m <= endM)) {
    const d = new Date(Date.UTC(y, m, 1))
    months.push(monthKey(d))
    m++
    if (m > 11) { m = 0; y++ }
  }
  return months
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiError("F8001", "Authentication required", 401)

  try {
    const accounts = await db.financeAccount.findMany({
      where: { userId: user.id, isHidden: false, type: { notIn: ["investment", "brokerage"] } },
      select: {
        id: true,
        name: true,
        type: true,
        mask: true,
        createdAt: true,
        institution: {
          select: { institutionName: true, provider: true },
        },
      },
    })

    if (accounts.length === 0) {
      return NextResponse.json({ accounts: [] })
    }

    // Use AI-identified card names when available
    const cardProfiles = await db.creditCardProfile.findMany({
      where: { userId: user.id },
      select: { accountId: true, cardName: true },
    })
    const cardNameMap = new Map(cardProfiles.map((c) => [c.accountId, c.cardName]))

    const now = new Date()
    const janThisYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))

    // Get monthly transaction counts for all accounts in one query
    const monthlyCounts = await db.$queryRaw<
      Array<{ accountId: string; month: string; count: bigint }>
    >`
      SELECT "accountId",
             TO_CHAR(date, 'YYYY-MM') as month,
             COUNT(*)::bigint as count
      FROM "FinanceTransaction"
      WHERE "userId" = ${user.id}
        AND "isDuplicate" = false
        AND "isExcluded" = false
      GROUP BY "accountId", TO_CHAR(date, 'YYYY-MM')
      ORDER BY "accountId", month
    `

    // Get date range per account
    const dateRanges = await db.$queryRaw<
      Array<{ accountId: string; earliest: Date | null; latest: Date | null; total: bigint }>
    >`
      SELECT "accountId",
             MIN(date) as earliest,
             MAX(date) as latest,
             COUNT(*)::bigint as total
      FROM "FinanceTransaction"
      WHERE "userId" = ${user.id}
        AND "isDuplicate" = false
        AND "isExcluded" = false
      GROUP BY "accountId"
    `

    // Build lookup maps
    const monthsByAccount = new Map<string, Set<string>>()
    for (const row of monthlyCounts) {
      const existing = monthsByAccount.get(row.accountId) ?? new Set()
      existing.add(row.month)
      monthsByAccount.set(row.accountId, existing)
    }

    const rangeByAccount = new Map(
      dateRanges.map((r) => [r.accountId, r])
    )

    const result: AccountCoverage[] = accounts.map((acct) => {
      const range = rangeByAccount.get(acct.id)
      const monthsWithDataSet = monthsByAccount.get(acct.id) ?? new Set<string>()
      const monthsWithData = [...monthsWithDataSet].sort()

      const earliest = range?.earliest ?? null
      const rangeStart = janThisYear
      const expectedMonths = generateExpectedMonths(rangeStart, now)

      // Use earliest transaction date or account creation — whichever is older —
      // to determine when we "know" the account existed
      const earliestKnown = earliest && earliest < acct.createdAt ? earliest : acct.createdAt
      const accountStartMonth = monthKey(earliestKnown)
      const emptyMonths = expectedMonths.filter((m) => !monthsWithDataSet.has(m))
      // "No activity" = account existed but zero transactions. "Missing" = before we knew about it.
      const monthsNoActivity = emptyMonths.filter((m) => m >= accountStartMonth)
      const monthsMissing = emptyMonths.filter((m) => m < accountStartMonth)

      const coveredMonths = monthsWithData.length + monthsNoActivity.length
      const coveragePercent = expectedMonths.length > 0
        ? Math.round((coveredMonths / expectedMonths.length) * 100)
        : 0

      return {
        accountId: acct.id,
        accountName: cardNameMap.get(acct.id) ?? acct.name,
        institutionName: acct.institution?.institutionName ?? "Unknown",
        provider: acct.institution?.provider ?? "unknown",
        type: acct.type ?? "checking",
        mask: acct.mask,
        earliestTransaction: earliest ? earliest.toISOString().split("T")[0] : null,
        latestTransaction: range?.latest ? range.latest.toISOString().split("T")[0] : null,
        totalTransactions: Number(range?.total ?? 0),
        monthsWithData,
        monthsMissing,
        monthsNoActivity,
        coveragePercent,
      }
    })

    return NextResponse.json({ accounts: result })
  } catch (err) {
    return apiError("F8002", "Failed to compute coverage", 500, err)
  }
}
