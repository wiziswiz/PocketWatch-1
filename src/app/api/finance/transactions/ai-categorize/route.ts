import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { cleanMerchantName, CATEGORIES, uncategorizedWhere } from "@/lib/finance/categorize"
import { buildAnonymizedMerchantsForCategorization, buildCategorizationPrompt, type AICategorizeResult } from "@/lib/finance/ai-categorize-prompt"
import { callAIProviderRaw, getProviderLabel, type AIProviderType } from "@/lib/finance/ai-providers"
import { decryptCredential } from "@/lib/finance/crypto"
import { financeRateLimiters, getClientId } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

const AI_SERVICES = ["ai_claude_cli", "ai_claude_api", "ai_openai", "ai_gemini"]

/**
 * POST /api/finance/transactions/ai-categorize
 * Uses AI to categorize uncategorized transactions in bulk.
 * Only anonymized merchant names are sent to the AI provider.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("AIC01", "Authentication required", 401)

  // Find AI provider — fall back to Claude CLI if no stored key
  const providerKey = await db.externalApiKey.findFirst({
    where: { userId: user.id, serviceName: { in: AI_SERVICES }, verified: true },
    orderBy: { updatedAt: "desc" },
  })

  const useCLIFallback = !providerKey

  // Rate limit only for remote API providers
  if (providerKey && providerKey.serviceName !== "ai_claude_cli") {
    const rl = financeRateLimiters.aiGenerate(getClientId(request))
    if (!rl.success) {
      return apiError("AIC02", "Rate limit exceeded. Try again in a few minutes.", 429)
    }
  }

  try {
    // Fetch uncategorized transactions (up to 200)
    const uncategorized = await db.financeTransaction.findMany({
      where: uncategorizedWhere(user.id),
      select: {
        id: true,
        merchantName: true,
        name: true,
        amount: true,
      },
      take: 200,
      orderBy: { date: "desc" },
    })

    const resolvedProvider = useCLIFallback ? "ai_claude_cli" : providerKey.serviceName

    if (uncategorized.length === 0) {
      return NextResponse.json({ suggestions: [], provider: resolvedProvider })
    }

    // Clean merchant names and group (case-insensitive lookup for AI response matching)
    const txsByMerchant = new Map<string, string[]>()
    const originalNames = new Map<string, string>() // lowercase → original cleaned name
    const cleanedTxs: Array<{ merchantName: string | null; name: string; amount: number }> = []

    for (const tx of uncategorized) {
      const cleaned = cleanMerchantName(tx.merchantName ?? tx.name)
      const ids = txsByMerchant.get(cleaned) ?? []
      ids.push(tx.id)
      txsByMerchant.set(cleaned, ids)
      originalNames.set(cleaned.toLowerCase(), cleaned)
      cleanedTxs.push({
        merchantName: cleaned,
        name: tx.name,
        amount: tx.amount,
      })
    }

    // Anonymize and build prompt
    const anonymized = buildAnonymizedMerchantsForCategorization(cleanedTxs)
    const prompt = buildCategorizationPrompt(anonymized)

    // Call AI provider (stored key or CLI fallback)
    let rawResponse: string
    if (useCLIFallback) {
      rawResponse = await callAIProviderRaw({ provider: "ai_claude_cli", apiKey: "enabled", model: undefined }, prompt)
    } else {
      const apiKey = await decryptCredential(providerKey.apiKeyEnc)
      rawResponse = await callAIProviderRaw(
        { provider: providerKey.serviceName as AIProviderType, apiKey, model: providerKey.model ?? undefined },
        prompt
      )
    }

    // Parse response
    const results = parseAICategorizeResponse(rawResponse)
    const validCategories = new Set(Object.keys(CATEGORIES))
    console.log(`[ai-categorize] AI returned ${results.length} results, ${uncategorized.length} uncategorized txs, ${txsByMerchant.size} unique merchants`)

    // Map back to transaction IDs (server-side only — IDs never sent to AI)
    // Use case-insensitive matching since AI may return names with different casing
    const suggestions = results
      .filter((r) => validCategories.has(r.category))
      .map((r) => {
        const exactIds = txsByMerchant.get(r.merchantName)
        const resolvedName = exactIds ? r.merchantName : originalNames.get(r.merchantName.toLowerCase())
        const ids = exactIds ?? (resolvedName ? txsByMerchant.get(resolvedName) ?? [] : [])
        return {
          merchantName: r.merchantName,
          transactionIds: ids,
          suggestedCategory: r.category,
          suggestedSubcategory: r.subcategory,
          confidence: r.confidence,
          reasoning: r.reasoning,
          transactionCount: ids.length,
        }
      })
      .filter((s) => s.transactionIds.length > 0)

    console.log(`[ai-categorize] ${suggestions.length} suggestions matched to transactions (${suggestions.reduce((sum, s) => sum + s.transactionCount, 0)} total txs)`)

    return NextResponse.json({
      suggestions,
      provider: resolvedProvider,
      providerLabel: getProviderLabel(resolvedProvider as AIProviderType),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI categorization failed"
    return apiError("AIC04", message, 500)
  }
}

function parseAICategorizeResponse(raw: string): AICategorizeResult[] {
  // Try to extract JSON array from the response
  const arrayMatch = raw.match(/\[[\s\S]*\]/)
  if (!arrayMatch) return []

  try {
    const parsed = JSON.parse(arrayMatch[0])
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item: unknown): item is AICategorizeResult =>
        typeof item === "object" && item !== null &&
        "merchantName" in item && "category" in item
      )
      .map((item) => ({
        merchantName: String(item.merchantName),
        category: String(item.category),
        subcategory: item.subcategory ? String(item.subcategory) : null,
        confidence: (["high", "medium", "low"].includes(item.confidence) ? item.confidence : "low") as AICategorizeResult["confidence"],
        reasoning: String(item.reasoning ?? ""),
      }))
  } catch {
    return []
  }
}
