import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { decryptCredential } from "@/lib/finance/crypto"
import { computeDeepInsights } from "@/lib/finance/deep-insights-engine"
import { buildAnonymizedFinancialContext } from "@/lib/finance/anonymize"
import { buildFinancialAnalysisPrompt, type AIInsightsResponse } from "@/lib/finance/ai-prompt"
import { callAIProvider, getProviderLabel, type AIProviderType } from "@/lib/finance/ai-providers"
import { getCached, setCache } from "@/lib/cache"
import { financeRateLimiters, getClientId } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

const AI_SERVICES = ["ai_claude_cli", "ai_claude_api", "ai_openai", "ai_gemini"]
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

interface CachedInsights {
  insights: AIInsightsResponse
  provider: string
  providerLabel: string
  generatedAt: string
}

/**
 * GET: Return cached AI insights if available.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("AII01", "Authentication required", 401)

  const scope = request.nextUrl.searchParams.get("scope") ?? "general"
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const cacheKey = `ai-insights:${user.id}:${month}:${scope}`

  const cached = getCached<CachedInsights>(cacheKey)
  if (cached) {
    return NextResponse.json({ available: true, ...cached })
  }

  // Check if user has an AI provider configured (Claude CLI always available as fallback)
  const storedProvider = await db.externalApiKey.findFirst({
    where: { userId: user.id, serviceName: { in: AI_SERVICES }, verified: true },
    select: { serviceName: true },
  })

  return NextResponse.json({
    available: false,
    hasProvider: true, // Claude CLI always available as fallback
    providerLabel: storedProvider
      ? getProviderLabel(storedProvider.serviceName as AIProviderType)
      : getProviderLabel("ai_claude_cli"),
  })
}

/**
 * POST: Generate AI insights (on-demand, user-triggered).
 * Query: ?force=true to bypass cache.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("AII02", "Authentication required", 401)

  const scope = request.nextUrl.searchParams.get("scope") ?? "general"
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const cacheKey = `ai-insights:${user.id}:${month}:${scope}`
  const force = request.nextUrl.searchParams.get("force") === "true"

  // Check cache first (unless force refresh)
  if (!force) {
    const cached = getCached<CachedInsights>(cacheKey)
    if (cached) {
      return NextResponse.json({ available: true, ...cached })
    }
  }

  // Find active AI provider — fall back to Claude CLI if no stored key
  const providerKey = await db.externalApiKey.findFirst({
    where: { userId: user.id, serviceName: { in: AI_SERVICES }, verified: true },
    orderBy: { updatedAt: "desc" },
  })

  const useCLIFallback = !providerKey

  // Rate limit only for remote API providers
  if (providerKey && providerKey.serviceName !== "ai_claude_cli") {
    const rl = financeRateLimiters.aiGenerate(getClientId(request))
    if (!rl.success) {
      return apiError("AII03", "Rate limit exceeded. Try again in a few minutes.", 429)
    }
  }

  try {
    let prompt: string

    if (scope === "investments") {
      // Investment-scoped: gather holdings and account data
      // Join holdings with securities for names/types
      const [rawHoldings, securities, accounts, investmentTxs] = await Promise.all([
        db.financeInvestmentHolding.findMany({
          where: { userId: user.id },
          select: { securityId: true, quantity: true, costBasis: true, institutionValue: true, institutionPrice: true },
        }),
        db.financeInvestmentSecurity.findMany({
          where: { userId: user.id },
          select: { securityId: true, name: true, tickerSymbol: true, type: true, closePrice: true },
        }),
        db.financeAccount.findMany({
          where: { userId: user.id, type: { in: ["investment", "brokerage"] } },
          select: { name: true, type: true, currentBalance: true, subtype: true },
        }),
        db.financeTransaction.findMany({
          where: { userId: user.id, category: { in: ["Investment", "Crypto"] }, isDuplicate: false, isExcluded: false },
          orderBy: { date: "desc" },
          take: 20,
          select: { name: true, amount: true, date: true, category: true },
        }),
      ])

      const secMap = new Map(securities.map((s) => [s.securityId, s]))
      const holdings = rawHoldings.map((h) => {
        const sec = h.securityId ? secMap.get(h.securityId) : undefined
        return { ...h, name: sec?.name ?? "Unknown", ticker: sec?.tickerSymbol ?? null, type: sec?.type ?? "other", value: h.institutionValue ?? (h.quantity ?? 0) * (sec?.closePrice ?? h.institutionPrice ?? 0) }
      })

      const totalValue = holdings.reduce((s, h) => s + h.value, 0)
      const totalCost = holdings.reduce((s, h) => s + (h.costBasis ?? 0), 0)
      const byType = new Map<string, number>()
      for (const h of holdings) {
        byType.set(h.type, (byType.get(h.type) ?? 0) + h.value)
      }
      const allocation = [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([type, value]) => `${type}: $${Math.round(value)} (${totalValue > 0 ? Math.round(value / totalValue * 100) : 0}%)`)
      const topHoldings = [...holdings].sort((a, b) => b.value - a.value).slice(0, 10).map((h) => `${h.ticker ?? h.name}: ${h.quantity ?? 0} shares, cost $${Math.round(h.costBasis ?? 0)}, value $${Math.round(h.value)}`)

      prompt = `You are a personal investment advisor. Analyze this portfolio and provide actionable insights.

PORTFOLIO SUMMARY:
- Total Value: $${Math.round(totalValue)}
- Total Cost Basis: $${Math.round(totalCost)}
- Gain/Loss: $${Math.round(totalValue - totalCost)} (${totalCost > 0 ? Math.round((totalValue - totalCost) / totalCost * 100) : 0}%)
- ${accounts.length} investment account(s)

ALLOCATION BY TYPE:
${allocation.join("\n")}

TOP HOLDINGS:
${topHoldings.join("\n")}

RECENT INVESTMENT TRANSACTIONS:
${investmentTxs.slice(0, 10).map(t => `${t.date.toISOString().slice(0, 10)}: ${t.name} $${Math.abs(t.amount).toFixed(2)}`).join("\n")}

Respond in JSON with this exact structure:
{"keyInsight":{"title":"<short title>","description":"<2-3 sentences>"},"savingsOpportunities":[{"area":"<area>","estimatedSavings":0,"description":"<advice>"}],"budgetRecommendations":[],"subscriptionReview":[],"anomalyComments":[],"actionItems":[{"action":"<specific action>","priority":"high|medium|low"}]}

Focus on: portfolio diversification, concentration risk, asset allocation balance, cost basis optimization, rebalancing needs, and tax-loss harvesting opportunities. Do NOT discuss spending or budgets.`
    } else {
      // General finance scope (existing behavior)
      const deepInsights = await computeDeepInsights(user.id)
      if (!deepInsights) {
        return apiError("AII05", "No financial data available to analyze.", 400)
      }

      const [budgets, subs] = await Promise.all([
        db.financeBudget.findMany({
          where: { userId: user.id, isActive: true },
          select: { category: true, monthlyLimit: true },
        }),
        db.financeSubscription.findMany({
          where: { userId: user.id },
          select: {
            merchantName: true, amount: true, frequency: true,
            category: true, status: true, isWanted: true,
            billType: true,
          },
        }),
      ])

      const budgetData = budgets.map((b) => {
        const health = deepInsights.budgetHealth.find((h) => h.category === b.category)
        return {
          category: b.category,
          monthlyLimit: b.monthlyLimit,
          spent: health?.spent ?? 0,
          percentUsed: health?.percentUsed ?? 0,
        }
      })

      const anonymized = buildAnonymizedFinancialContext(deepInsights, budgetData, subs)
      prompt = buildFinancialAnalysisPrompt(anonymized)
    }

    // Call AI provider (stored key or CLI fallback)
    let provider: AIProviderType
    let insights: AIInsightsResponse
    if (useCLIFallback) {
      provider = "ai_claude_cli"
      insights = await callAIProvider({ provider, apiKey: "enabled", model: undefined }, prompt)
    } else {
      const apiKey = await decryptCredential(providerKey.apiKeyEnc)
      provider = providerKey.serviceName as AIProviderType
      insights = await callAIProvider({ provider, apiKey, model: providerKey.model ?? undefined }, prompt)
    }

    const result: CachedInsights = {
      insights,
      provider,
      providerLabel: getProviderLabel(provider),
      generatedAt: new Date().toISOString(),
    }

    // Cache for 1 hour
    setCache(cacheKey, result, CACHE_TTL)

    return NextResponse.json({ available: true, ...result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI analysis failed"
    return apiError("AII06", message, 500)
  }
}
