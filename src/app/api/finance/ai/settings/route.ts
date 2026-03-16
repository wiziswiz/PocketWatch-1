import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { encryptCredential, decryptCredential } from "@/lib/finance/crypto"
import { verifyProvider, detectClaudeCLI, type AIProviderType } from "@/lib/finance/ai-providers"
import { AI_MODEL_OPTIONS } from "@/lib/finance/ai-model-options"
import { financeRateLimiters, getClientId } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

const AI_SERVICES = new Set(["ai_claude_cli", "ai_claude_api", "ai_openai", "ai_gemini"])

const PROVIDER_META: Record<string, { name: string; requiresKey: boolean }> = {
  ai_claude_cli: { name: "Claude CLI", requiresKey: false },
  ai_claude_api: { name: "Claude API", requiresKey: true },
  ai_openai: { name: "OpenAI", requiresKey: true },
  ai_gemini: { name: "Gemini", requiresKey: true },
}

/**
 * GET: List configured AI providers.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiError("AI001", "Authentication required", 401)

  let keys = await db.externalApiKey.findMany({
    where: { userId: user.id, serviceName: { in: [...AI_SERVICES] } },
    select: { id: true, serviceName: true, verified: true, verifyError: true, updatedAt: true, model: true },
  })

  const claudeCliDetected = await detectClaudeCLI()

  // Auto-register Claude CLI if detected and not yet in DB
  const hasCliRecord = keys.some((k) => k.serviceName === "ai_claude_cli")
  if (claudeCliDetected && !hasCliRecord) {
    try {
      // Actually test the CLI before marking as verified
      const verification = await verifyProvider({ provider: "ai_claude_cli", apiKey: "enabled" })
      const encrypted = await encryptCredential("enabled")
      await db.externalApiKey.create({
        data: {
          userId: user.id,
          serviceName: "ai_claude_cli",
          apiKeyEnc: encrypted,
          verified: verification.ok,
          verifyError: verification.error ?? null,
        },
      })
      keys = await db.externalApiKey.findMany({
        where: { userId: user.id, serviceName: { in: [...AI_SERVICES] } },
        select: { id: true, serviceName: true, verified: true, verifyError: true, updatedAt: true, model: true },
      })
    } catch {
      // Auto-register failed — user can still manually enable via UI
    }
  }

  // Self-heal: if CLI record exists but verification previously failed, retry on page load
  const cliRecord = keys.find((k) => k.serviceName === "ai_claude_cli")
  if (cliRecord && !cliRecord.verified && claudeCliDetected) {
    try {
      const recheck = await verifyProvider({ provider: "ai_claude_cli", apiKey: "enabled" })
      if (recheck.ok) {
        await db.externalApiKey.update({
          where: { id: cliRecord.id },
          data: { verified: true, verifyError: null },
        })
        keys = await db.externalApiKey.findMany({
          where: { userId: user.id, serviceName: { in: [...AI_SERVICES] } },
          select: { id: true, serviceName: true, verified: true, verifyError: true, updatedAt: true, model: true },
        })
      }
    } catch {
      // Self-heal failed — keep existing state
    }
  }

  const providers = keys.map((k) => ({
    provider: k.serviceName,
    name: PROVIDER_META[k.serviceName]?.name ?? k.serviceName,
    verified: k.verified,
    verifyError: k.verifyError,
    updatedAt: k.updatedAt.toISOString(),
    model: k.model,
  }))

  return NextResponse.json({ providers, claudeCliDetected })
}

/**
 * POST: Save a provider config and verify connectivity.
 * Body: { provider: string, apiKey?: string, model?: string }
 * For model-only updates, omit apiKey.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("AI002", "Authentication required", 401)

  const rl = financeRateLimiters.settingsWrite(getClientId(request))
  if (!rl.success) return apiError("AI003", "Rate limit exceeded", 429)

  const body = await request.json().catch(() => null)
  if (!body?.provider || !AI_SERVICES.has(body.provider)) {
    return apiError("AI004", "Invalid provider", 400)
  }

  const provider = body.provider as AIProviderType
  const meta = PROVIDER_META[provider]

  // Model-only update — verify the new model works before saving
  if (body.model !== undefined && !body.apiKey) {
    const existing = await db.externalApiKey.findFirst({
      where: { userId: user.id, serviceName: provider },
    })
    if (!existing) return apiError("AI008", "Provider not configured", 404)

    const validModels = AI_MODEL_OPTIONS[provider]?.map((m) => m.value) ?? []
    if (body.model && validModels.length > 0 && !validModels.includes(body.model)) {
      return apiError("AI009", "Invalid model for this provider", 400)
    }

    // For CLI, skip re-verification on model change — model names are from our predefined list
    // and running a test prompt for every dropdown change is slow and wasteful
    if (provider === "ai_claude_cli") {
      await db.externalApiKey.update({
        where: { id: existing.id },
        data: { model: body.model ?? null },
      })
      return NextResponse.json({
        provider,
        verified: existing.verified,
        verifyError: null,
        model: body.model ?? null,
      })
    }

    // For API providers, verify the new model works before saving
    const decryptedKey = await decryptCredential(existing.apiKeyEnc)
    const verification = await verifyProvider({
      provider,
      apiKey: decryptedKey,
      model: body.model ?? undefined,
    })

    await db.externalApiKey.update({
      where: { id: existing.id },
      data: {
        model: body.model ?? null,
        verified: verification.ok,
        verifyError: verification.error ?? null,
      },
    })

    return NextResponse.json({
      provider,
      verified: verification.ok,
      verifyError: verification.error ?? null,
      model: body.model ?? null,
    })
  }

  if (meta?.requiresKey && !body.apiKey?.trim()) {
    return apiError("AI005", "API key required for this provider", 400)
  }

  const apiKeyValue = meta?.requiresKey ? body.apiKey.trim() : "enabled"

  // Verify the provider before saving
  const verification = await verifyProvider({ provider, apiKey: apiKeyValue })

  const encrypted = await encryptCredential(apiKeyValue)

  // Upsert: one active AI provider per type per user
  const existing = await db.externalApiKey.findFirst({
    where: { userId: user.id, serviceName: provider },
  })

  if (existing) {
    await db.externalApiKey.update({
      where: { id: existing.id },
      data: {
        apiKeyEnc: encrypted,
        verified: verification.ok,
        verifyError: verification.error ?? null,
        model: body.model ?? existing.model ?? null,
      },
    })
  } else {
    await db.externalApiKey.create({
      data: {
        userId: user.id,
        serviceName: provider,
        apiKeyEnc: encrypted,
        verified: verification.ok,
        verifyError: verification.error ?? null,
        model: body.model ?? null,
      },
    })
  }

  return NextResponse.json({
    provider,
    verified: verification.ok,
    verifyError: verification.error ?? null,
    model: body.model ?? null,
  })
}

/**
 * DELETE: Remove an AI provider.
 * Query: ?provider=ai_claude_cli
 */
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return apiError("AI006", "Authentication required", 401)

  const provider = request.nextUrl.searchParams.get("provider")
  if (!provider || !AI_SERVICES.has(provider)) {
    return apiError("AI007", "Invalid provider", 400)
  }

  await db.externalApiKey.deleteMany({
    where: { userId: user.id, serviceName: provider },
  })

  return NextResponse.json({ deleted: true })
}
