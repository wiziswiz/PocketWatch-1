/**
 * Roame hotel data client.
 * Fetches the static hotel-data.json (12,858 hotels with points pricing)
 * and provides location-based search + name matching for cross-referencing.
 */

const HOTEL_DATA_URL = "https://roame.travel/hotel-data.json"
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// ─── Types ──────────────────────────────────────────────────────

interface RoameHotelPin {
  sequenceId: number
  hotelId: string
  lowestAwardPoints: number
  location: { type: string; coordinates: [number, number] } // [lon, lat]
  Label: string
  availabilityPercent: number
}

interface RoameHotelBrand {
  value: string
  label: string
}

interface RoameHotelData {
  hotelBrands: RoameHotelBrand[]
  hotelPins: RoameHotelPin[]
}

export interface RoameHotelMatch {
  hotelId: string
  name: string
  lowestAwardPoints: number
  brand: string | null
  subBrand: string | null
  coordinates: { lat: number; lng: number }
}

// ─── Cache ──────────────────────────────────────────────────────

let cachedData: RoameHotelData | null = null
let cacheTimestamp = 0

async function loadHotelData(): Promise<RoameHotelData> {
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData
  }

  const resp = await fetch(HOTEL_DATA_URL)
  if (!resp.ok) {
    throw new Error(`Failed to fetch Roame hotel data: ${resp.status}`)
  }

  cachedData = (await resp.json()) as RoameHotelData
  cacheTimestamp = Date.now()
  return cachedData
}

// ─── Brand Detection ────────────────────────────────────────────

const BRAND_PATTERNS: Record<string, { brand: string; program: string }> = {
  // Hilton family (ends with specific suffixes)
  HX: { brand: "Hilton", program: "Hilton Honors" },
  HW: { brand: "Hilton", program: "Hilton Honors" },
  HH: { brand: "Hilton", program: "Hilton Honors" },
  GI: { brand: "Hilton", program: "Hilton Honors" },
  HT: { brand: "Hilton", program: "Hilton Honors" },
  DT: { brand: "Hilton", program: "Hilton Honors" },
  ES: { brand: "Hilton", program: "Hilton Honors" },
  CH: { brand: "Hilton", program: "Hilton Honors" },
  WA: { brand: "Hilton", program: "Hilton Honors" },
  LX: { brand: "Hilton", program: "Hilton Honors" },
  QQ: { brand: "Hilton", program: "Hilton Honors" },
  PY: { brand: "Hilton", program: "Hilton Honors" },
  RU: { brand: "Hilton", program: "Hilton Honors" },
  UP: { brand: "Hilton", program: "Hilton Honors" },
}

function detectBrand(hotelId: string, name: string): { brand: string; subBrand: string | null; program: string } | null {
  // Marriott IDs start with lowercase 'm' + digits
  if (/^m\d/.test(hotelId)) {
    return { brand: "Marriott", subBrand: inferSubBrand(name, "Marriott"), program: "Marriott Bonvoy" }
  }

  // Hyatt names contain "Hyatt" or brand keywords
  const hyattBrands = ["Hyatt", "Andaz", "Park Hyatt", "Grand Hyatt", "Thompson"]
  if (hyattBrands.some((b) => name.includes(b))) {
    return { brand: "Hyatt", subBrand: inferSubBrand(name, "Hyatt"), program: "World of Hyatt" }
  }

  // Hilton by suffix
  const suffix = hotelId.slice(-2).toUpperCase()
  const match = BRAND_PATTERNS[suffix]
  if (match) {
    return { ...match, subBrand: inferSubBrand(name, "Hilton") }
  }

  // Name-based detection
  if (name.includes("Hilton") || name.includes("Hampton") || name.includes("DoubleTree") || name.includes("Embassy Suites") || name.includes("Conrad") || name.includes("Waldorf")) {
    return { brand: "Hilton", subBrand: inferSubBrand(name, "Hilton"), program: "Hilton Honors" }
  }
  if (name.includes("Marriott") || name.includes("Sheraton") || name.includes("Westin") || name.includes("W Hotel") || name.includes("St. Regis") || name.includes("Ritz-Carlton")) {
    return { brand: "Marriott", subBrand: inferSubBrand(name, "Marriott"), program: "Marriott Bonvoy" }
  }

  return null
}

function inferSubBrand(name: string, parentBrand: string): string | null {
  if (parentBrand === "Hilton") {
    if (name.includes("Hampton")) return "Hampton Inn"
    if (name.includes("DoubleTree")) return "DoubleTree"
    if (name.includes("Conrad")) return "Conrad"
    if (name.includes("Waldorf")) return "Waldorf Astoria"
    if (name.includes("Embassy")) return "Embassy Suites"
    if (name.includes("Garden Inn")) return "Hilton Garden Inn"
    if (name.includes("Home2")) return "Home2 Suites"
    if (name.includes("Homewood")) return "Homewood Suites"
    if (name.includes("Tru by")) return "Tru by Hilton"
    if (name.includes("Spark")) return "Spark by Hilton"
    return "Hilton"
  }
  if (parentBrand === "Marriott") {
    if (name.includes("JW Marriott")) return "JW Marriott"
    if (name.includes("St. Regis")) return "St. Regis"
    if (name.includes("Ritz-Carlton")) return "The Ritz-Carlton"
    if (name.includes("Westin")) return "Westin"
    if (name.includes("Sheraton")) return "Sheraton"
    if (name.includes("W Hotel")) return "W Hotels"
    if (name.includes("Courtyard")) return "Courtyard"
    if (name.includes("Residence Inn")) return "Residence Inn"
    if (name.includes("SpringHill")) return "SpringHill Suites"
    if (name.includes("Fairfield")) return "Fairfield Inn"
    return "Marriott"
  }
  if (parentBrand === "Hyatt") {
    if (name.includes("Park Hyatt")) return "Park Hyatt"
    if (name.includes("Grand Hyatt")) return "Grand Hyatt"
    if (name.includes("Andaz")) return "Andaz"
    if (name.includes("Hyatt Regency")) return "Hyatt Regency"
    if (name.includes("Hyatt Centric")) return "Hyatt Centric"
    if (name.includes("Hyatt Place")) return "Hyatt Place"
    if (name.includes("Hyatt House")) return "Hyatt House"
    if (name.includes("Thompson")) return "Thompson Hotels"
    return "Hyatt"
  }
  return null
}

// ─── Search ─────────────────────────────────────────────────────

/**
 * Search Roame hotel data by location name.
 * Uses the hotel labels to fuzzy-match against the query.
 */
export async function searchRoameHotels(query: string, limit = 50): Promise<RoameHotelMatch[]> {
  const data = await loadHotelData()
  const q = query.toLowerCase()

  const matches = data.hotelPins
    .filter((pin) => pin.lowestAwardPoints > 0 && pin.Label.toLowerCase().includes(q))
    .slice(0, limit)
    .map((pin) => {
      const brandInfo = detectBrand(pin.hotelId, pin.Label)
      return {
        hotelId: pin.hotelId,
        name: pin.Label,
        lowestAwardPoints: pin.lowestAwardPoints,
        brand: brandInfo?.brand ?? null,
        subBrand: brandInfo?.subBrand ?? null,
        coordinates: { lat: pin.location.coordinates[1], lng: pin.location.coordinates[0] },
      }
    })

  return matches
}

/**
 * Find the best Roame match for a SerpAPI hotel by name similarity.
 * Returns null if no good match found.
 */
export function matchRoameHotel(serpApiName: string, roameHotels: RoameHotelMatch[]): RoameHotelMatch | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  const target = normalize(serpApiName)

  let bestMatch: RoameHotelMatch | null = null
  let bestScore = 0

  for (const hotel of roameHotels) {
    const candidate = normalize(hotel.name)

    // Exact substring match
    if (candidate.includes(target) || target.includes(candidate)) {
      return hotel
    }

    // Word overlap scoring
    const targetWords = serpApiName.toLowerCase().split(/\s+/)
    const candidateWords = hotel.name.toLowerCase().split(/\s+/)
    const overlap = targetWords.filter((w) => w.length > 2 && candidateWords.some((cw) => cw.includes(w) || w.includes(cw))).length
    const score = overlap / Math.max(targetWords.length, candidateWords.length)

    if (score > bestScore && score > 0.4) {
      bestScore = score
      bestMatch = hotel
    }
  }

  return bestMatch
}
