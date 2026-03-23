/**
 * Static metro-area airport mapping for nearby-airport suggestions.
 * Covers major US metros and key international cities.
 */

const METRO_AIRPORTS: Record<string, string[]> = {
  // US metros
  MIA: ["FLL", "PBI"], FLL: ["MIA", "PBI"], PBI: ["MIA", "FLL"],
  JFK: ["EWR", "LGA"], EWR: ["JFK", "LGA"], LGA: ["JFK", "EWR"],
  LAX: ["SNA", "BUR", "ONT", "LGB"], SNA: ["LAX", "BUR"], BUR: ["LAX", "SNA"],
  ONT: ["LAX", "SNA"], LGB: ["LAX", "SNA"],
  SFO: ["OAK", "SJC"], OAK: ["SFO", "SJC"], SJC: ["SFO", "OAK"],
  ORD: ["MDW"], MDW: ["ORD"],
  DFW: ["DAL"], DAL: ["DFW"],
  IAD: ["DCA", "BWI"], DCA: ["IAD", "BWI"], BWI: ["IAD", "DCA"],
  IAH: ["HOU"], HOU: ["IAH"],
  // International
  HND: ["NRT"], NRT: ["HND"],
  LHR: ["LGW", "STN"], LGW: ["LHR", "STN"], STN: ["LHR", "LGW"],
  CDG: ["ORY"], ORY: ["CDG"],
}

/** Get nearby airports for a given IATA code. Returns empty array if none. */
export function getNearbyAirports(code: string): string[] {
  return METRO_AIRPORTS[code.toUpperCase()] || []
}

/** Check if an airport has known nearby alternatives. */
export function hasNearbyAirports(code: string): boolean {
  return code.toUpperCase() in METRO_AIRPORTS
}
