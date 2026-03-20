/**
 * Roame hotel search via GraphQL API.
 * Provides real-time award availability with date-specific pricing,
 * CPP values, room types, and cash price comparisons.
 *
 * Endpoint: POST https://roame.travel/encore/graphql
 * Auth: csrfSecret cookie (httpOnly, obtained from first page visit)
 */

// ─── Types ──────────────────────────────────────────────────────

interface RoameBoundingBox {
  type: "Point"
  coordinates: [number, number] // [lon, lat]
  bbox: [number, number, number, number] // [west, south, east, north]
}

interface SearchLocationResult {
  label: { label: string; value: string }
  bounding: RoameBoundingBox
  type: string
  desc: string | null
}

export interface RoameHotelRoom {
  hotelId: string
  roomCode: string
  roomName: string
  roomDescription: string
  roomType: string
  roomTypeLabel: string
  thumbnail: string | null
  mediaUrls: string[]
}

export interface RoameRoomOffer {
  avgAwardPoints: number
  avgCpp: number
  avgSurchargeUsd: number
  avgCashPriceUsd: number
  brand: string
  offerCode: string
  category: string
  hotelId: string
  mileageProgram: string
  nights: number
  roomCode: string
  roomType: string
  startDate: string
}

export interface RoameLiveHotel {
  hotelDetail: {
    id: string
    name: string
    description: string
    category: string
    brand: string
    addressLine1: string
    city: string
    stateProvince: string
    country: string
    previewImg: string | null
    url: string | null
    logo: string | null
    mileageProgram: string
    location: { type: string; coordinates: [number, number] }
    lowestCashUsd: number
  }
  availableRooms: {
    roomDetail: RoameHotelRoom
    offerPeriods: RoameRoomOffer[]
  }[]
  availabilityPercent: number
  lastUpdated: string
  offerSummary: {
    cashPriceUsd: number
    awardPoints: number
    cpp: number
  }
}

// ─── CSRF Cookie ────────────────────────────────────────────────

const GRAPHQL_URL = "https://roame.travel/encore/graphql"

let cachedCsrf: string | null = null
let csrfExpiry = 0
const CSRF_TTL_MS = 30 * 60 * 1000 // 30 minutes

async function getCSRFSecret(): Promise<string> {
  if (cachedCsrf && Date.now() < csrfExpiry) return cachedCsrf

  const resp = await fetch("https://roame.travel/hotels", {
    method: "HEAD",
    redirect: "follow",
  })

  const setCookie = resp.headers.get("set-cookie") || ""
  const match = setCookie.match(/csrfSecret=([^;]+)/)
  if (!match) {
    throw new Error("Failed to obtain Roame csrfSecret cookie")
  }

  cachedCsrf = decodeURIComponent(match[1])
  csrfExpiry = Date.now() + CSRF_TTL_MS
  return cachedCsrf
}

// ─── GraphQL Client ─────────────────────────────────────────────

async function roameGraphQL<T>(
  operationName: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const csrf = await getCSRFSecret()

  const resp = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `csrfSecret=${encodeURIComponent(csrf)}`,
    },
    body: JSON.stringify({ operationName, query, variables }),
  })

  if (!resp.ok) {
    throw new Error(`Roame GraphQL HTTP ${resp.status}: ${resp.statusText}`)
  }

  const json = (await resp.json()) as { data?: T; errors?: { message: string }[] }
  if (json.errors) {
    throw new Error(`Roame GraphQL: ${json.errors.map((e) => e.message).join("; ")}`)
  }
  if (!json.data) {
    throw new Error("Roame GraphQL: empty response")
  }

  return json.data
}

// ─── Queries ────────────────────────────────────────────────────

const SEARCH_LOCATIONS_QUERY = `
query SearchLocations($searchType: SearchType!, $value: String!) {
  searchLocations(searchType: $searchType, value: $value) {
    results {
      label { label value }
      bounding
      type
      desc
    }
  }
}`

const HOTEL_AVAILABLE_PERIODS_QUERY = `
query HotelAvailablePeriods($input: HotelRoomPeriodWhereInput!) {
  hotelAvailablePeriods(input: $input) {
    availableHotels {
      ...HotelAvailabilityPeriodItem
    }
    hasMore
    endCursor
  }
}

fragment HotelItem on Hotel {
  id name description category brand
  addressLine1 city stateProvince country
  previewImg url logo mileageProgram location lowestCashUsd
}

fragment HotelRoomItem on HotelRoom {
  hotelId roomCode roomName roomDescription
  roomType roomTypeLabel thumbnail mediaUrls
}

fragment HotelRoomOfferPeriodItem on HotelRoomOfferPeriod {
  avgAwardPoints avgCpp avgSurchargeUsd avgCashPriceUsd
  brand offerCode category hotelId mileageProgram
  nights roomCode roomType startDate
}

fragment HotelAvailableRoomItem on HotelAvailableRoom {
  roomDetail { ...HotelRoomItem }
  offerPeriods { ...HotelRoomOfferPeriodItem }
}

fragment HotelAvailabilityPeriodItem on HotelAvailabilityPeriod {
  hotelDetail { ...HotelItem }
  availableRooms { ...HotelAvailableRoomItem }
  availabilityPercent lastUpdated
  offerSummary { cashPriceUsd awardPoints cpp }
}`

// ─── Public API ─────────────────────────────────────────────────

/**
 * Geocode a location name to a bounding box for hotel search.
 */
export async function searchRoameLocation(query: string): Promise<RoameBoundingBox | null> {
  const data = await roameGraphQL<{
    searchLocations: { results: SearchLocationResult[] }[]
  }>("SearchLocations", SEARCH_LOCATIONS_QUERY, {
    searchType: "HOTELS",
    value: query,
  })

  const results = data.searchLocations?.[0]?.results
  if (!results || results.length === 0) return null

  return results[0].bounding
}

/**
 * Search for hotels with real-time award availability.
 */
export async function searchRoameHotelsLive(
  bounding: RoameBoundingBox,
  startDate: string,
  endDate: string,
  options?: {
    mileagePrograms?: string[]
    minNights?: number
    sortBy?: "AwardPoints" | "CPP" | "CashPrice"
    maxPoints?: number
    cursor?: string
  },
): Promise<{ hotels: RoameLiveHotel[]; hasMore: boolean; endCursor: string | null }> {
  const input = {
    awardPointsRange: { start: 0, end: options?.maxPoints ?? 300000 },
    cppMin: 0,
    mileagePrograms: options?.mileagePrograms ?? ["ALL"],
    brands: { values: [], includes: false },
    stayDateRange: { startDate, endDate },
    minNights: options?.minNights ?? 1,
    roomType: "All",
    startCursorGT: options?.cursor ?? null,
    sortBy: options?.sortBy ?? "AwardPoints",
    mapBoundInput: { bounding, enforce: true },
  }

  const data = await roameGraphQL<{
    hotelAvailablePeriods: {
      availableHotels: RoameLiveHotel[]
      hasMore: boolean
      endCursor: string | null
    }
  }>("HotelAvailablePeriods", HOTEL_AVAILABLE_PERIODS_QUERY, { input })

  return {
    hotels: data.hotelAvailablePeriods.availableHotels,
    hasMore: data.hotelAvailablePeriods.hasMore,
    endCursor: data.hotelAvailablePeriods.endCursor,
  }
}

// ─── Brand → Program Mapping ────────────────────────────────────

const BRAND_PROGRAMS: Record<string, string> = {
  HYATT: "World of Hyatt",
  HILTON: "Hilton Honors",
  MARRIOTT: "Marriott Bonvoy",
  IHG: "IHG One Rewards",
  REGENCY: "World of Hyatt",
  CENTRIC: "World of Hyatt",
  PLACE: "World of Hyatt",
  HOUSE: "World of Hyatt",
  THOMPSON: "World of Hyatt",
  ANDAZ: "World of Hyatt",
}

export function roameProgramLabel(mileageProgram: string): string {
  return BRAND_PROGRAMS[mileageProgram] ?? mileageProgram
}
