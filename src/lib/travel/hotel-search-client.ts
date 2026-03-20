/**
 * SerpAPI Google Hotels client.
 * Searches hotels via Google Hotels API and returns UnifiedHotelResult[].
 */

import type { UnifiedHotelResult, HotelSearchConfig } from "@/types/travel"

const SERPAPI_BASE = "https://serpapi.com/search.json"

interface SerpApiHotelProperty {
  type?: string
  name?: string
  description?: string
  hotel_class?: number
  overall_rating?: number
  reviews?: number
  rate_per_night?: { lowest?: string; extracted_lowest?: number }
  total_rate?: { lowest?: string; extracted_lowest?: number }
  amenities?: string[]
  images?: { thumbnail?: string; original_image?: string }[]
  gps_coordinates?: { latitude?: number; longitude?: number }
  nearby_places?: unknown[]
}

interface SerpApiHotelResponse {
  properties?: SerpApiHotelProperty[]
  error?: string
}

function parseProperty(prop: SerpApiHotelProperty, index: number): UnifiedHotelResult {
  return {
    id: `hotel-serpapi-${index}`,
    name: prop.name || "Unknown Hotel",
    description: prop.description || "",
    location: "",
    hotelClass: prop.hotel_class || 0,
    overallRating: prop.overall_rating || 0,
    reviews: prop.reviews || 0,
    amenities: prop.amenities || [],
    images: (prop.images || []).map((img) => img.thumbnail || img.original_image || "").filter(Boolean),
    cashPerNight: prop.rate_per_night?.extracted_lowest || null,
    cashTotal: prop.total_rate?.extracted_lowest || null,
    currency: "USD",
    bookingLinks: [],
    pointsPerNight: null,
    pointsProgram: null,
    brand: null,
    subBrand: null,
    hotelCode: null,
    sources: ["serpapi"],
  }
}

export async function searchSerpApiHotels(apiKey: string, config: HotelSearchConfig): Promise<UnifiedHotelResult[]> {
  const params = new URLSearchParams({
    engine: "google_hotels",
    q: config.query,
    check_in_date: config.checkInDate,
    check_out_date: config.checkOutDate,
    adults: String(config.adults),
    currency: config.currency || "USD",
    gl: "us",
    hl: "en",
    api_key: apiKey,
  })

  const resp = await fetch(`${SERPAPI_BASE}?${params}`)
  if (!resp.ok) {
    throw new Error(`SerpAPI Hotels failed: HTTP ${resp.status}`)
  }

  const data = (await resp.json()) as SerpApiHotelResponse
  if (data.error) {
    throw new Error(`SerpAPI Hotels error: ${data.error}`)
  }

  if (!data.properties || data.properties.length === 0) {
    return []
  }

  return data.properties.map((prop, i) => parseProperty(prop, i))
}
