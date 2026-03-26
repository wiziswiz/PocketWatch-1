/**
 * Airline ancillary fee estimates — checked bags, carry-ons, seat selection.
 * These are approximations for domestic/international economy class.
 * Used to show "true cost" on flight cards so users can compare apples-to-apples.
 *
 * Sources: airline websites, DOT baggage fee data (2025-2026).
 */

export interface AirlineFees {
  checkedBag: number | null   // First checked bag, one-way
  carryOn: number | null      // Personal item + carry-on (null = free)
  seatSelection: number | null // Standard seat selection
  total: number               // Sum of non-null fees (1 checked bag + seat)
}

// Fee data by IATA code (economy class, domestic, USD)
const AIRLINE_FEES: Record<string, { checked: number; carryon: number | null; seat: number | null }> = {
  // US Majors — bags included or standard fees
  AA: { checked: 35, carryon: null, seat: null },
  UA: { checked: 35, carryon: null, seat: null },
  DL: { checked: 35, carryon: null, seat: null },
  AS: { checked: 35, carryon: null, seat: null },
  WN: { checked: 0, carryon: null, seat: null },   // Southwest: 2 free bags
  HA: { checked: 35, carryon: null, seat: null },
  // US ULCCs — everything costs extra
  NK: { checked: 45, carryon: 40, seat: 10 },       // Spirit
  F9: { checked: 40, carryon: 35, seat: 8 },        // Frontier
  B6: { checked: 35, carryon: null, seat: null },    // JetBlue (Blue basic charges)
  SY: { checked: 30, carryon: null, seat: null },    // Sun Country
  // European
  BA: { checked: 0, carryon: null, seat: null },     // BA includes 1 bag on transatlantic
  LH: { checked: 0, carryon: null, seat: null },     // Lufthansa includes on long-haul
  AF: { checked: 0, carryon: null, seat: null },     // Air France includes
  KL: { checked: 0, carryon: null, seat: null },     // KLM includes
  IB: { checked: 0, carryon: null, seat: null },     // Iberia includes
  VS: { checked: 0, carryon: null, seat: null },     // Virgin Atlantic includes
  SK: { checked: 0, carryon: null, seat: null },     // SAS
  AY: { checked: 0, carryon: null, seat: null },     // Finnair
  TP: { checked: 0, carryon: null, seat: null },     // TAP
  TK: { checked: 0, carryon: null, seat: null },     // Turkish includes
  EI: { checked: 0, carryon: null, seat: null },     // Aer Lingus transatlantic
  // European ULCCs
  FR: { checked: 30, carryon: 10, seat: 6 },         // Ryanair
  U2: { checked: 30, carryon: null, seat: 6 },       // easyJet
  W6: { checked: 35, carryon: 15, seat: 8 },         // Wizz Air
  // Middle East / Asia — generally include bags
  EK: { checked: 0, carryon: null, seat: null },     // Emirates
  QR: { checked: 0, carryon: null, seat: null },     // Qatar
  EY: { checked: 0, carryon: null, seat: null },     // Etihad
  SQ: { checked: 0, carryon: null, seat: null },     // Singapore
  CX: { checked: 0, carryon: null, seat: null },     // Cathay
  JL: { checked: 0, carryon: null, seat: null },     // JAL
  NH: { checked: 0, carryon: null, seat: null },     // ANA
  TG: { checked: 0, carryon: null, seat: null },     // Thai
  KE: { checked: 0, carryon: null, seat: null },     // Korean Air
  OZ: { checked: 0, carryon: null, seat: null },     // Asiana
  QF: { checked: 0, carryon: null, seat: null },     // Qantas
  NZ: { checked: 0, carryon: null, seat: null },     // Air NZ
  // Americas
  AC: { checked: 0, carryon: null, seat: null },     // Air Canada (includes on int'l)
  AV: { checked: 0, carryon: null, seat: null },     // Avianca
  LA: { checked: 0, carryon: null, seat: null },     // LATAM
  CM: { checked: 0, carryon: null, seat: null },     // Copa
  AM: { checked: 0, carryon: null, seat: null },     // Aeromexico
}

/**
 * Estimate ancillary fees for a flight based on airline.
 * Returns null if airline is unknown.
 */
export function estimateAirlineFees(airlineCode: string): AirlineFees | null {
  const iata = airlineCode.toUpperCase().slice(0, 2)
  const fees = AIRLINE_FEES[iata]
  if (!fees) return null

  return {
    checkedBag: fees.checked,
    carryOn: fees.carryon,
    seatSelection: fees.seat,
    total: fees.checked + (fees.carryon ?? 0) + (fees.seat ?? 0),
  }
}

/** Extract first IATA code from operating airlines array or airline string */
export function extractFirstIATA(operatingAirlines: string[], airline: string): string {
  // Operating airlines might already be IATA codes
  for (const op of operatingAirlines) {
    if (/^[A-Z0-9]{2}$/.test(op)) return op
  }
  // Try to match from airline name
  const NAME_MAP: Record<string, string> = {
    "american": "AA", "united": "UA", "delta": "DL", "southwest": "WN",
    "jetblue": "B6", "alaska": "AS", "spirit": "NK", "frontier": "F9",
    "british airways": "BA", "emirates": "EK", "qatar": "QR",
    "lufthansa": "LH", "air france": "AF", "klm": "KL", "ryanair": "FR",
    "easyjet": "U2", "wizz": "W6", "singapore": "SQ", "cathay": "CX",
    "turkish": "TK", "etihad": "EY", "qantas": "QF", "jal": "JL",
    "ana": "NH", "korean": "KE", "aer lingus": "EI", "tap": "TP",
    "iberia": "IB", "virgin atlantic": "VS", "hawaiian": "HA",
    "sun country": "SY", "copa": "CM", "avianca": "AV", "latam": "LA",
  }
  const lower = airline.toLowerCase()
  for (const [name, code] of Object.entries(NAME_MAP)) {
    if (lower.includes(name)) return code
  }
  return ""
}
