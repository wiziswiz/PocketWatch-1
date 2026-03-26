/**
 * Fare flexibility analysis — maps fare class codes to refund/change policies.
 * Based on ATPCO fare rule categories and airline-specific booking class data.
 *
 * Fare class letters vary by airline, but follow industry-wide conventions:
 * - F/A/P = First (flexible)
 * - J/C/D/I/Z = Business (varies)
 * - W/E = Premium Economy
 * - Y/B/M = Full Economy (flexible)
 * - H/K/L/V/S/N/Q/O/G = Discount Economy (restricted)
 */

export interface FareFlexibility {
  level: "flexible" | "semi-flexible" | "restricted" | "basic"
  refundable: boolean
  changeable: boolean
  changeFeeTier: "free" | "low" | "moderate" | "high" | "none"
  label: string
  shortLabel: string
  description: string
}

// Fare class → flexibility tier (industry-wide defaults, airline can override)
const FARE_CLASS_TIERS: Record<string, FareFlexibility["level"]> = {
  // First class — almost always fully flexible
  F: "flexible", A: "flexible", P: "flexible",
  // Business — full fare vs discount
  J: "flexible", C: "semi-flexible", D: "semi-flexible",
  I: "restricted", Z: "restricted",
  // Premium economy
  W: "semi-flexible", R: "semi-flexible",
  // Economy — full fare
  Y: "flexible", B: "semi-flexible",
  // Economy — mid-tier
  M: "semi-flexible", H: "semi-flexible", K: "semi-flexible",
  // Economy — discounted
  L: "restricted", V: "restricted", S: "restricted",
  // Economy — deep discount
  N: "basic", Q: "basic", O: "basic", G: "basic",
  // Basic economy markers
  E: "basic", T: "restricted", U: "restricted", X: "basic",
}

// Airline-specific overrides where conventions differ
const AIRLINE_OVERRIDES: Record<string, Record<string, FareFlexibility["level"]>> = {
  // United: N is basic economy
  UA: { N: "basic", S: "basic", T: "basic" },
  // American: O/S are deep discount but not "basic economy" (that's B on AA domestic)
  AA: { O: "restricted", S: "restricted" },
  // Delta: E is basic economy, X is deep discount
  DL: { E: "basic", X: "basic", L: "restricted", U: "restricted" },
  // Southwest: no fare classes (all flexible-ish)
  WN: { Y: "flexible", B: "semi-flexible", M: "semi-flexible", S: "semi-flexible" },
  // British Airways: V/N/Q/O are very restricted
  BA: { V: "basic", N: "basic", Q: "basic", O: "basic" },
  // Emirates: T/W are low-tier economy, X/E/G are saver
  EK: { T: "restricted", W: "restricted", X: "basic", E: "basic", G: "basic" },
}

const FLEXIBILITY_DETAILS: Record<FareFlexibility["level"], Omit<FareFlexibility, "level">> = {
  flexible: {
    refundable: true,
    changeable: true,
    changeFeeTier: "free",
    label: "Fully Flexible",
    shortLabel: "Flex",
    description: "Free changes, fully refundable",
  },
  "semi-flexible": {
    refundable: false,
    changeable: true,
    changeFeeTier: "low",
    label: "Changeable",
    shortLabel: "Change OK",
    description: "Changes allowed (fee may apply), not refundable",
  },
  restricted: {
    refundable: false,
    changeable: true,
    changeFeeTier: "high",
    label: "Restricted",
    shortLabel: "Limited",
    description: "High change fees, non-refundable",
  },
  basic: {
    refundable: false,
    changeable: false,
    changeFeeTier: "none",
    label: "No Changes",
    shortLabel: "Basic",
    description: "Non-refundable, no changes permitted",
  },
}

/**
 * Analyze fare flexibility from a fare class code.
 * Returns null if fare class is empty or unrecognizable.
 */
export function analyzeFareFlexibility(
  fareClass: string,
  airlineCode?: string,
): FareFlexibility | null {
  if (!fareClass) return null

  // Extract the first letter (booking class designator)
  const code = fareClass.charAt(0).toUpperCase()

  // Check airline-specific override first
  let level: FareFlexibility["level"] | undefined
  if (airlineCode) {
    const iata = airlineCode.toUpperCase().slice(0, 2)
    level = AIRLINE_OVERRIDES[iata]?.[code]
  }

  // Fall back to industry default
  if (!level) {
    level = FARE_CLASS_TIERS[code]
  }

  if (!level) return null

  return { level, ...FLEXIBILITY_DETAILS[level] }
}

/** Get the IATA code from an airline name for override lookup */
export function extractAirlineCode(airline: string): string | undefined {
  // Common mappings — just enough for the override lookup
  const NAME_TO_IATA: Record<string, string> = {
    "american": "AA", "united": "UA", "delta": "DL", "southwest": "WN",
    "jetblue": "B6", "alaska": "AS", "spirit": "NK", "frontier": "F9",
    "british airways": "BA", "emirates": "EK", "qatar": "QR",
    "lufthansa": "LH", "air france": "AF", "klm": "KL",
  }
  const lower = airline.toLowerCase()
  for (const [name, code] of Object.entries(NAME_TO_IATA)) {
    if (lower.includes(name)) return code
  }
  return undefined
}
