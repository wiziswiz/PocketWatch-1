/**
 * point.me Auth0 token management — refresh expired JWTs automatically.
 *
 * Auth0 public client (SPA) — uses refresh_token grant without client_secret.
 * Client ID and issuer extracted from captured JWT claims.
 */

const AUTH0_ISSUER = "https://auth.point.me"
const AUTH0_CLIENT_ID = "8Rr1MhOWHjGGfdHp6PqUsUbGMeQfbrdp"

interface PointMeTokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
}

/**
 * Decode a JWT's payload without verification (we just need the exp claim).
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split(".")
  if (parts.length !== 3) throw new Error("Invalid JWT format")
  const payload = Buffer.from(parts[1]!, "base64url").toString("utf-8")
  return JSON.parse(payload) as Record<string, unknown>
}

/**
 * Check if a point.me JWT is expired (with 5-minute buffer).
 */
export function isPointMeTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwtPayload(token)
    const exp = payload.exp as number | undefined
    if (!exp) return true
    return Date.now() / 1000 > exp - 300 // 5 min buffer
  } catch {
    return true
  }
}

/**
 * Use an Auth0 refresh token to get a new access token.
 */
export async function refreshPointMeToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const resp = await fetch(`${AUTH0_ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: AUTH0_CLIENT_ID,
      refresh_token: refreshToken,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => "")
    throw new Error(`point.me token refresh failed (${resp.status}): ${text.slice(0, 200)}`)
  }

  const data = (await resp.json()) as PointMeTokenResponse
  return {
    accessToken: data.access_token,
    // Auth0 may rotate the refresh token
    refreshToken: data.refresh_token || refreshToken,
  }
}

/**
 * Parse a point.me session blob — accepts:
 * - Full session JSON from `/api/auth/session` (has accessToken + refreshToken)
 * - Raw JWT string (eyJ...)
 *
 * Returns extracted tokens.
 */
export function parsePointMeCredential(
  input: string,
): { accessToken: string; refreshToken: string | null } {
  const trimmed = input.trim()

  // Raw JWT
  if (trimmed.startsWith("eyJ") && !trimmed.startsWith("{")) {
    return { accessToken: trimmed, refreshToken: null }
  }

  // JSON session object
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const accessToken = parsed.accessToken as string | undefined
    const refreshToken = (parsed.refreshToken as string | undefined) || null

    if (accessToken && typeof accessToken === "string") {
      return { accessToken, refreshToken }
    }

    // Maybe it's { access_token: ... } format
    const altToken = parsed.access_token as string | undefined
    if (altToken && typeof altToken === "string") {
      return {
        accessToken: altToken,
        refreshToken: (parsed.refresh_token as string | undefined) || null,
      }
    }

    throw new Error("JSON does not contain accessToken or access_token field")
  } catch (err) {
    if ((err as Error).message.includes("JSON does not contain")) throw err
    throw new Error("Invalid input — paste the full session JSON or a raw JWT (eyJ...)")
  }
}
