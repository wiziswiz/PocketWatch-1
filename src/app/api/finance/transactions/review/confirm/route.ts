import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { cleanMerchantName, computeNewConfidence, CONFIDENCE, CATEGORIES } from "@/lib/finance/categorize"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

const bodySchema = z.object({
  transactionId: z.string().min(1),
  action: z.enum(["accept", "change", "skip"]),
  category: z.string().optional(),
  subcategory: z.string().optional(),
})

/**
 * POST /api/finance/transactions/review/confirm
 * Handles accept/change/skip actions from the review flow.
 * All multi-step writes are wrapped in db.$transaction for atomicity.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("F9200", "Authentication required", 401)

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return apiError("F9201", parsed.error.issues[0]?.message ?? "Invalid request", 400)
  }

  const { transactionId, action, category, subcategory } = parsed.data

  try {
    const tx = await db.financeTransaction.findFirst({
      where: { id: transactionId, userId: user.id },
    })
    if (!tx) return apiError("F9202", "Transaction not found", 404)

    // Guard: only allow accept/change on transactions actually in review
    if (action !== "skip" && !tx.needsReview) {
      return apiError("F9206", "Transaction is not in review queue", 400)
    }

    if (action === "skip") {
      await db.financeTransaction.update({
        where: { id: transactionId },
        data: { reviewSkippedAt: new Date() },
      })
      return NextResponse.json({ action: "skipped" })
    }

    if (action === "accept") {
      let newConf: number | undefined
      await db.$transaction(async (prisma) => {
        await prisma.financeTransaction.update({
          where: { id: transactionId },
          data: { needsReview: false },
        })

        if (tx.merchantName) {
          const cleaned = cleanMerchantName(tx.merchantName)
          const rule = await prisma.financeCategoryRule.findFirst({
            where: { userId: user.id, matchType: "contains", matchValue: cleaned, category: tx.category! },
          })
          if (rule) {
            newConf = computeNewConfidence(rule.confidence, "confirmed")
            await prisma.financeCategoryRule.update({
              where: { id: rule.id },
              data: { confidence: newConf, timesConfirmed: { increment: 1 }, lastUsedAt: new Date() },
            })

            // If rule crossed AUTO_APPLY threshold, clear review on all matching txns
            if (newConf >= CONFIDENCE.AUTO_APPLY && rule.confidence < CONFIDENCE.AUTO_APPLY) {
              await prisma.financeTransaction.updateMany({
                where: {
                  userId: user.id, needsReview: true, category: tx.category,
                  name: { contains: cleaned, mode: "insensitive" },
                },
                data: { needsReview: false },
              })
            }
          }
        }
      })
      return NextResponse.json({ action: "accepted", confidence: newConf })
    }

    // action === "change"
    if (!category) {
      return apiError("F9203", "Category required for change action", 400)
    }

    // Validate category against allowed set
    const customCategories = await db.financeCustomCategory.findMany({ where: { userId: user.id }, select: { label: true } })
    const validCategories = new Set([...Object.keys(CATEGORIES), ...customCategories.map((c) => c.label)])
    if (!validCategories.has(category)) {
      return apiError("F9205", `Invalid category: ${category}`, 400)
    }

    await db.$transaction(async (prisma) => {
      // Penalize the old rule
      if (tx.merchantName && tx.category) {
        const cleaned = cleanMerchantName(tx.merchantName)
        const oldRule = await prisma.financeCategoryRule.findFirst({
          where: { userId: user.id, matchType: "contains", matchValue: cleaned, category: tx.category },
        })
        if (oldRule) {
          await prisma.financeCategoryRule.update({
            where: { id: oldRule.id },
            data: {
              confidence: computeNewConfidence(oldRule.confidence, "overridden"),
              timesOverridden: { increment: 1 },
              lastUsedAt: new Date(),
            },
          })
        }
      }

      // Update transaction
      await prisma.financeTransaction.update({
        where: { id: transactionId },
        data: { category, subcategory: subcategory ?? null, isAutoApplied: false, needsReview: false },
      })

      // Create/update rule for the new category
      if (tx.merchantName) {
        const cleaned = cleanMerchantName(tx.merchantName)
        if (cleaned.length > 1) {
          const existing = await prisma.financeCategoryRule.findFirst({
            where: { userId: user.id, matchType: "contains", matchValue: cleaned },
          })
          if (existing) {
            await prisma.financeCategoryRule.update({
              where: { id: existing.id },
              data: { category, subcategory: subcategory ?? null, confidence: CONFIDENCE.INITIAL_USER, source: "user", lastUsedAt: new Date() },
            })
          } else {
            await prisma.financeCategoryRule.create({
              data: { userId: user.id, matchType: "contains", matchValue: cleaned, category, subcategory: subcategory ?? null, priority: 10, confidence: CONFIDENCE.INITIAL_USER, source: "user" },
            })
          }
        }
      }
    })

    return NextResponse.json({ action: "changed", category })
  } catch (err) {
    return apiError("F9204", "Failed to confirm review", 500, err)
  }
}
