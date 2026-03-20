/**
 * Hotel search orchestrator.
 * Runs parallel searches across SerpAPI + Roame + ATF and merges results
 * into unified hotel results with both cash and points pricing.
 */

import type { UnifiedHotelResult, HotelSearchConfig, HotelDashboardResults } from "@/types/travel"
import { searchSerpApiHotels } from "./hotel-search-client"
import { searchRoameHotels, matchRoameHotel, type RoameHotelMatch } from "./roame-hotel-client"
import { searchATFHotels, atfBrandToProgram, type ATFHotelMatch } from "./atf-hotel-client"

// ─── Credentials ────────────────────────────────────────────────

export interface HotelSearchCredentials {
  serpApiKey: string | null
  atfApiKey: string | null
}

// ─── Matching ───────────────────────────────────────────────────

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function matchATFHotel(serpApiName: string, atfHotels: ATFHotelMatch[]): ATFHotelMatch | null {
  const target = normalizeForMatch(serpApiName)

  for (const hotel of atfHotels) {
    const candidate = normalizeForMatch(hotel.name)
    if (candidate.includes(target) || target.includes(candidate)) {
      return hotel
    }
  }

  // Word overlap scoring
  const targetWords = serpApiName.toLowerCase().split(/\s+/)
  let bestMatch: ATFHotelMatch | null = null
  let bestScore = 0

  for (const hotel of atfHotels) {
    const candidateWords = hotel.name.toLowerCase().split(/\s+/)
    const overlap = targetWords.filter(
      (w) => w.length > 2 && candidateWords.some((cw) => cw.includes(w) || w.includes(cw)),
    ).length
    const score = overlap / Math.max(targetWords.length, candidateWords.length)

    if (score > bestScore && score > 0.4) {
      bestScore = score
      bestMatch = hotel
    }
  }

  return bestMatch
}

// ─── Merge Logic ────────────────────────────────────────────────

function mergePointsData(
  hotels: UnifiedHotelResult[],
  roameHotels: RoameHotelMatch[],
  atfHotels: ATFHotelMatch[],
): UnifiedHotelResult[] {
  return hotels.map((hotel) => {
    const merged = { ...hotel }

    // Try Roame match first (has actual points pricing)
    const roameMatch = matchRoameHotel(hotel.name, roameHotels)
    if (roameMatch && roameMatch.lowestAwardPoints > 0) {
      merged.pointsPerNight = roameMatch.lowestAwardPoints
      merged.pointsProgram = roameMatch.brand === "Hilton" ? "Hilton Honors"
        : roameMatch.brand === "Marriott" ? "Marriott Bonvoy"
        : roameMatch.brand === "Hyatt" ? "World of Hyatt"
        : null
      merged.brand = roameMatch.brand
      merged.subBrand = roameMatch.subBrand
      merged.hotelCode = roameMatch.hotelId
      merged.sources = [...merged.sources, "roame"]
    }

    // Try ATF match (has brand/availability info, may confirm or supplement Roame)
    const atfMatch = matchATFHotel(hotel.name, atfHotels)
    if (atfMatch) {
      if (!merged.brand) merged.brand = atfMatch.brand
      if (!merged.subBrand) merged.subBrand = atfMatch.subBrand
      if (!merged.pointsProgram) merged.pointsProgram = atfBrandToProgram(atfMatch.brand)
      if (!merged.hotelCode) merged.hotelCode = atfMatch.hotelCode
      if (!merged.location) merged.location = atfMatch.location
      if (!merged.sources.includes("atf")) merged.sources = [...merged.sources, "atf"]
    }

    return merged
  })
}

// ─── Add Points-Only Hotels ─────────────────────────────────────

function addPointsOnlyHotels(
  hotels: UnifiedHotelResult[],
  roameHotels: RoameHotelMatch[],
  existingNames: Set<string>,
  limit: number,
): UnifiedHotelResult[] {
  const pointsOnly: UnifiedHotelResult[] = []
  const normalizedExisting = new Set([...existingNames].map(normalizeForMatch))

  for (const roame of roameHotels) {
    if (pointsOnly.length >= limit) break
    if (roame.lowestAwardPoints <= 0) continue

    const normalized = normalizeForMatch(roame.name)
    if (normalizedExisting.has(normalized)) continue

    // Check word overlap to avoid adding duplicates with slightly different names
    const alreadyMatched = [...normalizedExisting].some((existing) =>
      existing.includes(normalized) || normalized.includes(existing),
    )
    if (alreadyMatched) continue

    pointsOnly.push({
      id: `hotel-roame-${roame.hotelId}`,
      name: roame.name,
      description: "",
      location: "",
      hotelClass: 0,
      overallRating: 0,
      reviews: 0,
      amenities: [],
      images: [],
      cashPerNight: null,
      cashTotal: null,
      currency: "USD",
      bookingLinks: [],
      pointsPerNight: roame.lowestAwardPoints,
      pointsProgram: roame.brand === "Hilton" ? "Hilton Honors"
        : roame.brand === "Marriott" ? "Marriott Bonvoy"
        : roame.brand === "Hyatt" ? "World of Hyatt"
        : null,
      brand: roame.brand,
      subBrand: roame.subBrand,
      hotelCode: roame.hotelId,
      sources: ["roame"],
    })
    normalizedExisting.add(normalized)
  }

  return [...hotels, ...pointsOnly]
}

// ─── Main Orchestrator ──────────────────────────────────────────

export async function searchHotels(
  config: HotelSearchConfig,
  credentials: HotelSearchCredentials,
): Promise<HotelDashboardResults> {
  const sources: string[] = []
  const promises: Promise<void>[] = []

  let serpApiResults: UnifiedHotelResult[] = []
  let roameResults: RoameHotelMatch[] = []
  let atfResults: ATFHotelMatch[] = []

  // SerpAPI (cash prices, images, reviews)
  if (credentials.serpApiKey) {
    promises.push(
      searchSerpApiHotels(credentials.serpApiKey, config)
        .then((hotels) => {
          serpApiResults = hotels
          sources.push("serpapi")
        })
        .catch(() => { /* SerpAPI failed — continue with other sources */ }),
    )
  }

  // Roame (points pricing from static hotel-data.json)
  promises.push(
    searchRoameHotels(config.query)
      .then((hotels) => {
        roameResults = hotels
        sources.push("roame")
      })
      .catch(() => { /* Roame failed — continue */ }),
  )

  // ATF (brand info + availability)
  if (credentials.atfApiKey) {
    promises.push(
      searchATFHotels(credentials.atfApiKey, config.query)
        .then((hotels) => {
          atfResults = hotels
          sources.push("atf")
        })
        .catch(() => { /* ATF failed — continue */ }),
    )
  }

  await Promise.all(promises)

  // Merge: start with SerpAPI results, enrich with Roame + ATF points data
  let merged = mergePointsData(serpApiResults, roameResults, atfResults)

  // Add points-only hotels that SerpAPI didn't find (up to 10 extra)
  const existingNames = new Set(merged.map((h) => h.name))
  merged = addPointsOnlyHotels(merged, roameResults, existingNames, 10)

  return {
    meta: {
      query: config.query,
      checkIn: config.checkInDate,
      checkOut: config.checkOutDate,
      adults: config.adults,
      searchedAt: new Date().toISOString(),
      sources,
    },
    hotels: merged,
  }
}
