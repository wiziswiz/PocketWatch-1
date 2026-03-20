/**
 * ATF (Award Travel Finder) hotel client.
 * Calls the ATF MCP server via Streamable HTTP to search for points-bookable hotels.
 * Supports Marriott, Hyatt, Hilton, and IHG properties.
 */

const ATF_MCP_URL = "https://mcp.awardtravelfinder.com/mcp"

// ─── Types ──────────────────────────────────────────────────────

interface ATFHotel {
  code: string
  name: string
  brand: string
  sub_brand: string
  location: string
  availability: string
}

export interface ATFHotelMatch {
  hotelCode: string
  name: string
  brand: string
  subBrand: string
  location: string
  availabilityPct: number
}

// ─── MCP Session ────────────────────────────────────────────────

async function mcpRequest(
  apiKey: string,
  sessionId: string | null,
  method: string,
  params?: Record<string, unknown>,
  id?: number,
): Promise<{ data: unknown; sessionId: string }> {
  const body: Record<string, unknown> = { jsonrpc: "2.0", method, id: id ?? 1 }
  if (params) body.params = params

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "X-API-Key": apiKey,
  }
  if (sessionId) headers["Mcp-Session-Id"] = sessionId

  const resp = await fetch(ATF_MCP_URL, { method: "POST", headers, body: JSON.stringify(body) })

  const newSessionId = resp.headers.get("mcp-session-id") || sessionId || ""
  const text = await resp.text()

  // Parse SSE format: "event: message\ndata: {...}"
  const dataMatch = text.match(/data:\s*(.+)/)
  if (!dataMatch) throw new Error(`ATF MCP: no data in response`)

  const parsed = JSON.parse(dataMatch[1])
  if (parsed.error) throw new Error(`ATF MCP error: ${parsed.error.message}`)

  return { data: parsed.result, sessionId: newSessionId }
}

// ─── Search ─────────────────────────────────────────────────────

/**
 * Search ATF for points-bookable hotels by query.
 * Returns hotel codes, names, brands, and availability.
 */
export async function searchATFHotels(
  apiKey: string,
  query: string,
  brand?: "Marriott" | "Hilton" | "IHG",
  limit = 10,
): Promise<ATFHotelMatch[]> {
  // Initialize MCP session
  const init = await mcpRequest(apiKey, null, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "pocketwatch", version: "1.0" },
  })

  // Call search_hotels
  const args: Record<string, unknown> = { query, limit }
  if (brand) args.brand = brand

  const result = await mcpRequest(apiKey, init.sessionId, "tools/call", {
    name: "search_hotels",
    arguments: args,
  }, 2)

  // Parse result content
  const content = (result.data as { content: { type: string; text: string }[] }).content
  const textContent = content?.find((c) => c.type === "text")?.text
  if (!textContent) return []

  const parsed = JSON.parse(textContent)
  if (parsed.error) return []

  const hotels = (parsed.hotels || []) as ATFHotel[]

  return hotels.map((h) => ({
    hotelCode: h.code,
    name: h.name,
    brand: h.brand,
    subBrand: h.sub_brand,
    location: h.location,
    availabilityPct: parseInt(h.availability) || 0,
  }))
}

const BRAND_PROGRAMS: Record<string, string> = {
  Marriott: "Marriott Bonvoy",
  Hyatt: "World of Hyatt",
  Hilton: "Hilton Honors",
  IHG: "IHG One Rewards",
}

export function atfBrandToProgram(brand: string): string {
  return BRAND_PROGRAMS[brand] || brand
}
