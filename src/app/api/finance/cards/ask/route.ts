import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { decryptCredential } from "@/lib/finance/crypto"
import { callAIProviderRaw, type AIProviderType } from "@/lib/finance/ai-providers"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

const AI_SERVICES = ["ai_claude_cli", "ai_claude_api", "ai_openai", "ai_gemini"]

const askSchema = z.object({
  cardProfileId: z.string().min(1),
  question: z.string().min(1).max(500),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("CQ01", "Authentication required", 401)

  const body = await request.json()
  const parsed = askSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("CQ02", parsed.error.issues[0]?.message ?? "Invalid request", 400)
  }

  const { cardProfileId, question, history } = parsed.data

  const card = await db.creditCardProfile.findFirst({
    where: { id: cardProfileId, userId: user.id },
  })
  if (!card) return apiError("CQ03", "Card not found", 404)

  const providerKey = await db.externalApiKey.findFirst({
    where: { userId: user.id, serviceName: { in: AI_SERVICES }, verified: true },
    orderBy: { updatedAt: "desc" },
  })

  const aiData = card.aiEnrichedData as Record<string, unknown> | null

  const cardContext = [
    `CARD: ${card.cardName}`,
    `NETWORK: ${card.cardNetwork}`,
    `REWARD TYPE: ${card.rewardType}`,
    `REWARD PROGRAM: ${card.rewardProgram ?? "N/A"}`,
    `ANNUAL FEE: $${card.annualFee}`,
    `BASE REWARD RATE: ${card.baseRewardRate}x`,
  ]

  if (aiData) {
    if (Array.isArray(aiData.rewardMultipliers)) {
      cardContext.push(`\nREWARD MULTIPLIERS:\n${(aiData.rewardMultipliers as Array<{ category: string; rate: number; unit: string; description?: string }>).map((m) => `- ${m.category}: ${m.rate}x ${m.unit}${m.description ? ` (${m.description})` : ""}`).join("\n")}`)
    }
    if (Array.isArray(aiData.benefits)) {
      cardContext.push(`\nBENEFITS:\n${(aiData.benefits as Array<{ name: string; description: string }>).map((b) => `- ${b.name}: ${b.description}`).join("\n")}`)
    }
    if (aiData.foreignTransactionFee) {
      cardContext.push(`FOREIGN TRANSACTION FEE: ${aiData.foreignTransactionFee}`)
    }
  }

  const conversationHistory = (history ?? [])
    .slice(-6)
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n")

  const prompt = `You are a credit card expert who knows everything about the ${card.cardName}. Answer the user's question with specific, accurate details. Include exact numbers, coverage amounts, time limits, and eligibility rules when relevant. Be concise but thorough. If you're not certain about a specific detail, say so.

CARD DETAILS:
${cardContext.join("\n")}

${conversationHistory ? `CONVERSATION HISTORY:\n${conversationHistory}\n` : ""}
User question: ${question}

Answer concisely and specifically. No marketing language.`

  try {
    let rawText: string
    if (!providerKey) {
      rawText = await callAIProviderRaw({ provider: "ai_claude_cli", apiKey: "enabled", model: undefined }, prompt)
    } else {
      const apiKey = await decryptCredential(providerKey.apiKeyEnc)
      rawText = await callAIProviderRaw({ provider: providerKey.serviceName as AIProviderType, apiKey, model: providerKey.model ?? undefined }, prompt)
    }

    return NextResponse.json({ answer: rawText.trim() })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get answer"
    return apiError("CQ04", message, 500)
  }
}
