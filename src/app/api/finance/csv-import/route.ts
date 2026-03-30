import { createHash } from "crypto"
import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { NextResponse, type NextRequest } from "next/server"
import { parseBankCSV, deduplicateTransactions } from "@/lib/finance/csv-import"
import { categorizeTransaction, cleanMerchantName } from "@/lib/finance/categorize"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("F9010", "Authentication required", 401)

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const accountId = formData.get("accountId") as string | null
    const format = formData.get("format") as string | null
    const confirm = req.nextUrl.searchParams.get("confirm") === "true"

    if (!file) return apiError("F9011", "No file provided", 400)
    if (file.size > MAX_FILE_SIZE) return apiError("F9012", "File exceeds 5MB limit", 400)

    const buffer = await file.arrayBuffer()
    let csvText: string
    try {
      csvText = new TextDecoder("utf-8", { fatal: true }).decode(buffer)
    } catch {
      csvText = new TextDecoder("latin1").decode(buffer)
    }

    const parsed = parseBankCSV(csvText, format ?? undefined)
    if (parsed.length === 0) {
      return apiError("F9013", "No transactions could be parsed from file", 400)
    }

    // Preview mode: return parsed transactions without inserting
    if (!confirm) {
      return NextResponse.json({ transactions: parsed, count: parsed.length })
    }

    // Confirm mode: insert into DB
    if (!accountId) return apiError("F9014", "accountId required for confirm", 400)

    const account = await db.financeAccount.findFirst({
      where: { id: accountId, userId: user.id },
    })
    if (!account) return apiError("F9015", "Account not found", 404)

    // Assign stable sequence numbers BEFORE dedup so hashes stay consistent across re-uploads
    const seqCounts = new Map<string, number>()
    const seqMap = parsed.map((txn) => {
      const key = `${txn.date}|${txn.amount.toFixed(2)}|${txn.description}`
      const seq = (seqCounts.get(key) ?? 0) + 1
      seqCounts.set(key, seq)
      return seq
    })

    // Dedup against existing transactions (count-aware)
    const existingTxns = await db.financeTransaction.findMany({
      where: { userId: user.id, accountId },
      select: { date: true, amount: true, name: true },
    })
    const unique = deduplicateTransactions(parsed, existingTxns)
    const uniqueSet = new Set(unique)

    const userRules = await db.financeCategoryRule.findMany({
      where: { userId: user.id },
    })

    const createData = parsed
      .map((txn, i) => {
        if (!uniqueSet.has(txn)) return null
        const cleaned = cleanMerchantName(txn.description)
        const cat = categorizeTransaction({ merchantName: cleaned, rawName: txn.description }, userRules)
        const hash = createHash("sha256")
          .update(`${accountId}|${txn.date}|${txn.amount.toFixed(2)}|${txn.description}|${seqMap[i]}`)
          .digest("hex")
          .slice(0, 32)

        return {
          userId: user.id,
          accountId,
          externalId: `csv_${hash}`,
          provider: "csv" as const,
          date: new Date(txn.date),
          name: txn.description,
          merchantName: txn.merchantName ?? cleaned,
          amount: txn.amount,
          currency: account.currency ?? "USD",
          category: cat.category === "Uncategorized" ? null : cat.category,
          subcategory: cat.subcategory,
          isPending: false,
        }
      })
      .filter((d) => d !== null)

    const result = await db.financeTransaction.createMany({ data: createData, skipDuplicates: true })

    return NextResponse.json({ inserted: result.count, duplicatesSkipped: parsed.length - result.count })
  } catch (err) {
    return apiError("F9019", "Failed to process CSV import", 500, err)
  }
}
