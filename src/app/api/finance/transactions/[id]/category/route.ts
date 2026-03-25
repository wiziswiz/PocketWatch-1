import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { cleanMerchantName, computeNewConfidence, CONFIDENCE, CATEGORIES } from "@/lib/finance/categorize"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod/v4"

const patchSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().optional(),
  nickname: z.string().optional(),
  createRule: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return apiError("F4030", "Authentication required", 401)

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("F4031", parsed.error.issues[0]?.message ?? "Invalid request", 400)
  }

  const { category, subcategory, nickname, createRule } = parsed.data

  // Validate category against allowed set
  const customCategories = await db.financeCustomCategory.findMany({ where: { userId: user.id }, select: { label: true } })
  const validCategories = new Set([...Object.keys(CATEGORIES), ...customCategories.map((c) => c.label)])
  if (!validCategories.has(category)) {
    return apiError("F4034", `Invalid category: ${category}`, 400)
  }

  try {
    const tx = await db.financeTransaction.findFirst({
      where: { id, userId: user.id },
    })
    if (!tx) return apiError("F4032", "Transaction not found", 404)

    // Wrap all writes in a single atomic transaction
    const updated = await db.$transaction(async (prisma) => {
      // If overriding an auto-applied category, penalize the old rule
      if (tx.isAutoApplied && tx.category && tx.category !== category) {
        const cleaned = cleanMerchantName(tx.merchantName ?? tx.name)
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
      const result = await prisma.financeTransaction.update({
        where: { id },
        data: {
          category,
          subcategory: subcategory ?? null,
          isAutoApplied: false,
          needsReview: false,
          ...(nickname !== undefined ? { nickname: nickname || null } : {}),
        },
      })

      // Create/update rule for this merchant
      if (createRule && tx.merchantName) {
        const cleaned = cleanMerchantName(tx.merchantName)
        if (cleaned.length > 1) {
          const existing = await prisma.financeCategoryRule.findFirst({
            where: { userId: user.id, matchType: "contains", matchValue: cleaned },
          })

          if (existing) {
            const newConf = existing.category === category
              ? computeNewConfidence(existing.confidence, "confirmed")
              : CONFIDENCE.INITIAL_USER
            await prisma.financeCategoryRule.update({
              where: { id: existing.id },
              data: {
                category,
                subcategory: subcategory ?? null,
                confidence: newConf,
                timesConfirmed: existing.category === category ? { increment: 1 } : existing.timesConfirmed,
                lastUsedAt: new Date(),
                source: "user",
                ...(nickname !== undefined ? { nickname: nickname || null } : {}),
              },
            })
          } else {
            await prisma.financeCategoryRule.create({
              data: {
                userId: user.id,
                matchType: "contains",
                matchValue: cleaned,
                category,
                subcategory: subcategory ?? null,
                priority: 10,
                confidence: CONFIDENCE.INITIAL_USER,
                source: "user",
                ...(nickname !== undefined ? { nickname: nickname || null } : {}),
              },
            })
          }

          // Batch-apply to other uncategorized transactions
          await prisma.financeTransaction.updateMany({
            where: {
              userId: user.id,
              id: { not: id },
              OR: [{ category: null }, { category: "" }, { category: "Uncategorized" }],
              name: { contains: cleaned, mode: "insensitive" },
            },
            data: {
              category,
              subcategory: subcategory ?? null,
              isAutoApplied: true,
              needsReview: true,
              ...(nickname !== undefined ? { nickname: nickname || null } : {}),
            },
          })
        }
      }

      return result
    })

    return NextResponse.json(updated)
  } catch (err) {
    return apiError("F4033", "Failed to update category", 500, err)
  }
}
