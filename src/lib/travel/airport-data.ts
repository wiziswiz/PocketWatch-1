import type { Airport } from "./airport-types"

/**
 * Curated airport database for typeahead search.
 * Covers major international hubs, popular award destinations,
 * and all airports referenced in sweet-spots + nearby-airports.
 */
export const AIRPORTS: readonly Airport[] = [
  // ─── United States ──────────────────────────────────────────────
  { iata: "ATL", name: "Hartsfield-Jackson", city: "Atlanta", country: "US" },
  { iata: "AUS", name: "Austin-Bergstrom", city: "Austin", country: "US" },
  { iata: "BNA", name: "Nashville Intl", city: "Nashville", country: "US" },
  { iata: "BOS", name: "Logan Intl", city: "Boston", country: "US" },
  { iata: "BUR", name: "Hollywood Burbank", city: "Burbank", country: "US", keywords: ["Los Angeles"] },
  { iata: "BWI", name: "Baltimore/Washington", city: "Baltimore", country: "US", keywords: ["Washington"] },
  { iata: "CLE", name: "Cleveland Hopkins", city: "Cleveland", country: "US" },
  { iata: "CLT", name: "Charlotte Douglas", city: "Charlotte", country: "US" },
  { iata: "CVG", name: "Cincinnati/Northern Kentucky", city: "Cincinnati", country: "US" },
  { iata: "DAL", name: "Dallas Love Field", city: "Dallas", country: "US" },
  { iata: "DCA", name: "Reagan National", city: "Washington", country: "US", keywords: ["DC", "Arlington"] },
  { iata: "DEN", name: "Denver Intl", city: "Denver", country: "US" },
  { iata: "DFW", name: "Dallas/Fort Worth", city: "Dallas", country: "US", keywords: ["Fort Worth"] },
  { iata: "DTW", name: "Detroit Metro Wayne", city: "Detroit", country: "US" },
  { iata: "EWR", name: "Newark Liberty", city: "Newark", country: "US", keywords: ["New York"] },
  { iata: "FLL", name: "Fort Lauderdale-Hollywood", city: "Fort Lauderdale", country: "US", keywords: ["Miami"] },
  { iata: "HNL", name: "Daniel K. Inouye", city: "Honolulu", country: "US", keywords: ["Hawaii"] },
  { iata: "HOU", name: "William P. Hobby", city: "Houston", country: "US" },
  { iata: "IAD", name: "Dulles Intl", city: "Washington", country: "US", keywords: ["DC", "Dulles"] },
  { iata: "IAH", name: "George Bush Intercontinental", city: "Houston", country: "US" },
  { iata: "IND", name: "Indianapolis Intl", city: "Indianapolis", country: "US" },
  { iata: "JFK", name: "John F. Kennedy", city: "New York", country: "US", keywords: ["NYC"] },
  { iata: "LAS", name: "Harry Reid Intl", city: "Las Vegas", country: "US", keywords: ["Vegas"] },
  { iata: "LAX", name: "Los Angeles Intl", city: "Los Angeles", country: "US", keywords: ["LA"] },
  { iata: "LGA", name: "LaGuardia", city: "New York", country: "US", keywords: ["NYC"] },
  { iata: "LGB", name: "Long Beach", city: "Long Beach", country: "US", keywords: ["Los Angeles"] },
  { iata: "MCI", name: "Kansas City Intl", city: "Kansas City", country: "US" },
  { iata: "MCO", name: "Orlando Intl", city: "Orlando", country: "US", keywords: ["Disney"] },
  { iata: "MDW", name: "Midway Intl", city: "Chicago", country: "US" },
  { iata: "MIA", name: "Miami Intl", city: "Miami", country: "US" },
  { iata: "MSP", name: "Minneapolis-Saint Paul", city: "Minneapolis", country: "US", keywords: ["Saint Paul"] },
  { iata: "MSY", name: "Louis Armstrong", city: "New Orleans", country: "US", keywords: ["NOLA"] },
  { iata: "OAK", name: "Oakland Intl", city: "Oakland", country: "US", keywords: ["San Francisco"] },
  { iata: "ONT", name: "Ontario Intl", city: "Ontario", country: "US", keywords: ["Los Angeles"] },
  { iata: "ORD", name: "O'Hare Intl", city: "Chicago", country: "US" },
  { iata: "PBI", name: "Palm Beach Intl", city: "West Palm Beach", country: "US", keywords: ["Miami"] },
  { iata: "PDX", name: "Portland Intl", city: "Portland", country: "US" },
  { iata: "PHL", name: "Philadelphia Intl", city: "Philadelphia", country: "US" },
  { iata: "PHX", name: "Phoenix Sky Harbor", city: "Phoenix", country: "US" },
  { iata: "PIT", name: "Pittsburgh Intl", city: "Pittsburgh", country: "US" },
  { iata: "RDU", name: "Raleigh-Durham", city: "Raleigh", country: "US", keywords: ["Durham"] },
  { iata: "SAN", name: "San Diego Intl", city: "San Diego", country: "US" },
  { iata: "SAT", name: "San Antonio Intl", city: "San Antonio", country: "US" },
  { iata: "SEA", name: "Seattle-Tacoma", city: "Seattle", country: "US", keywords: ["Tacoma"] },
  { iata: "SFO", name: "San Francisco Intl", city: "San Francisco", country: "US" },
  { iata: "SJC", name: "San Jose Intl", city: "San Jose", country: "US", keywords: ["Silicon Valley"] },
  { iata: "SLC", name: "Salt Lake City Intl", city: "Salt Lake City", country: "US" },
  { iata: "SNA", name: "John Wayne", city: "Santa Ana", country: "US", keywords: ["Orange County", "Los Angeles"] },
  { iata: "STL", name: "St. Louis Lambert", city: "St. Louis", country: "US" },
  { iata: "TPA", name: "Tampa Intl", city: "Tampa", country: "US" },

  // ─── Canada ─────────────────────────────────────────────────────
  { iata: "YUL", name: "Montréal-Trudeau", city: "Montreal", country: "Canada", keywords: ["Montréal"] },
  { iata: "YVR", name: "Vancouver Intl", city: "Vancouver", country: "Canada" },
  { iata: "YYC", name: "Calgary Intl", city: "Calgary", country: "Canada" },
  { iata: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "Canada" },

  // ─── Mexico & Caribbean ─────────────────────────────────────────
  { iata: "CUN", name: "Cancún Intl", city: "Cancún", country: "Mexico", keywords: ["Cancun"] },
  { iata: "GDL", name: "Guadalajara Intl", city: "Guadalajara", country: "Mexico" },
  { iata: "MEX", name: "Benito Juárez", city: "Mexico City", country: "Mexico", keywords: ["CDMX"] },
  { iata: "SJD", name: "Los Cabos", city: "San José del Cabo", country: "Mexico", keywords: ["Cabo"] },
  { iata: "PVR", name: "Gustavo Díaz Ordaz", city: "Puerto Vallarta", country: "Mexico" },
  { iata: "MBJ", name: "Sangster Intl", city: "Montego Bay", country: "Jamaica" },
  { iata: "NAS", name: "Lynden Pindling", city: "Nassau", country: "Bahamas" },
  { iata: "PUJ", name: "Punta Cana Intl", city: "Punta Cana", country: "Dominican Republic" },
  { iata: "SXM", name: "Princess Juliana", city: "Sint Maarten", country: "Sint Maarten" },
  { iata: "SJU", name: "Luis Muñoz Marín", city: "San Juan", country: "Puerto Rico" },

  // ─── South America ──────────────────────────────────────────────
  { iata: "BOG", name: "El Dorado", city: "Bogotá", country: "Colombia", keywords: ["Bogota"] },
  { iata: "EZE", name: "Ministro Pistarini", city: "Buenos Aires", country: "Argentina", keywords: ["Ezeiza"] },
  { iata: "GIG", name: "Galeão", city: "Rio de Janeiro", country: "Brazil" },
  { iata: "GRU", name: "Guarulhos", city: "São Paulo", country: "Brazil", keywords: ["Sao Paulo"] },
  { iata: "LIM", name: "Jorge Chávez", city: "Lima", country: "Peru" },
  { iata: "SCL", name: "Arturo Merino Benítez", city: "Santiago", country: "Chile" },

  // ─── United Kingdom & Ireland ───────────────────────────────────
  { iata: "DUB", name: "Dublin Airport", city: "Dublin", country: "Ireland" },
  { iata: "EDI", name: "Edinburgh Airport", city: "Edinburgh", country: "UK", keywords: ["Scotland"] },
  { iata: "LGW", name: "Gatwick", city: "London", country: "UK" },
  { iata: "LHR", name: "Heathrow", city: "London", country: "UK" },
  { iata: "MAN", name: "Manchester Airport", city: "Manchester", country: "UK" },
  { iata: "STN", name: "Stansted", city: "London", country: "UK" },

  // ─── Western Europe ─────────────────────────────────────────────
  { iata: "AMS", name: "Schiphol", city: "Amsterdam", country: "Netherlands" },
  { iata: "BCN", name: "El Prat", city: "Barcelona", country: "Spain" },
  { iata: "BRU", name: "Brussels Airport", city: "Brussels", country: "Belgium" },
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France" },
  { iata: "CPH", name: "Kastrup", city: "Copenhagen", country: "Denmark" },
  { iata: "FCO", name: "Fiumicino", city: "Rome", country: "Italy", keywords: ["Roma"] },
  { iata: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },
  { iata: "GVA", name: "Geneva Airport", city: "Geneva", country: "Switzerland" },
  { iata: "HEL", name: "Helsinki-Vantaa", city: "Helsinki", country: "Finland" },
  { iata: "LIS", name: "Humberto Delgado", city: "Lisbon", country: "Portugal", keywords: ["Lisboa"] },
  { iata: "MAD", name: "Barajas", city: "Madrid", country: "Spain" },
  { iata: "MUC", name: "Franz Josef Strauss", city: "Munich", country: "Germany", keywords: ["München"] },
  { iata: "MXP", name: "Malpensa", city: "Milan", country: "Italy", keywords: ["Milano"] },
  { iata: "NCE", name: "Côte d'Azur", city: "Nice", country: "France" },
  { iata: "ORY", name: "Orly", city: "Paris", country: "France" },
  { iata: "OSL", name: "Gardermoen", city: "Oslo", country: "Norway" },
  { iata: "ARN", name: "Arlanda", city: "Stockholm", country: "Sweden" },
  { iata: "VIE", name: "Vienna Intl", city: "Vienna", country: "Austria", keywords: ["Wien"] },
  { iata: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland", keywords: ["Zürich"] },

  // ─── Eastern Europe & Turkey ────────────────────────────────────
  { iata: "ATH", name: "Eleftherios Venizelos", city: "Athens", country: "Greece" },
  { iata: "BUD", name: "Budapest Liszt Ferenc", city: "Budapest", country: "Hungary" },
  { iata: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey", keywords: ["Türkiye"] },
  { iata: "PRG", name: "Václav Havel", city: "Prague", country: "Czech Republic", keywords: ["Praha"] },
  { iata: "WAW", name: "Chopin Airport", city: "Warsaw", country: "Poland", keywords: ["Warszawa"] },

  // ─── Middle East ────────────────────────────────────────────────
  { iata: "AMM", name: "Queen Alia", city: "Amman", country: "Jordan" },
  { iata: "AUH", name: "Zayed Intl", city: "Abu Dhabi", country: "UAE" },
  { iata: "DOH", name: "Hamad Intl", city: "Doha", country: "Qatar" },
  { iata: "DXB", name: "Dubai Intl", city: "Dubai", country: "UAE" },
  { iata: "JED", name: "King Abdulaziz", city: "Jeddah", country: "Saudi Arabia", keywords: ["Jidda"] },
  { iata: "RUH", name: "King Khalid", city: "Riyadh", country: "Saudi Arabia" },
  { iata: "TLV", name: "Ben Gurion", city: "Tel Aviv", country: "Israel" },

  // ─── East Asia ──────────────────────────────────────────────────
  { iata: "HKG", name: "Hong Kong Intl", city: "Hong Kong", country: "Hong Kong" },
  { iata: "HND", name: "Haneda", city: "Tokyo", country: "Japan" },
  { iata: "ICN", name: "Incheon Intl", city: "Seoul", country: "South Korea" },
  { iata: "KIX", name: "Kansai Intl", city: "Osaka", country: "Japan" },
  { iata: "NRT", name: "Narita Intl", city: "Tokyo", country: "Japan" },
  { iata: "PEK", name: "Capital Intl", city: "Beijing", country: "China" },
  { iata: "PVG", name: "Pudong Intl", city: "Shanghai", country: "China" },
  { iata: "TPE", name: "Taoyuan Intl", city: "Taipei", country: "Taiwan" },

  // ─── Southeast Asia ─────────────────────────────────────────────
  { iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thailand" },
  { iata: "CGK", name: "Soekarno-Hatta", city: "Jakarta", country: "Indonesia" },
  { iata: "DPS", name: "Ngurah Rai", city: "Bali", country: "Indonesia", keywords: ["Denpasar"] },
  { iata: "HAN", name: "Noi Bai", city: "Hanoi", country: "Vietnam" },
  { iata: "KUL", name: "Kuala Lumpur Intl", city: "Kuala Lumpur", country: "Malaysia" },
  { iata: "MNL", name: "Ninoy Aquino", city: "Manila", country: "Philippines" },
  { iata: "SGN", name: "Tan Son Nhat", city: "Ho Chi Minh City", country: "Vietnam", keywords: ["Saigon"] },
  { iata: "SIN", name: "Changi", city: "Singapore", country: "Singapore" },

  // ─── South Asia ─────────────────────────────────────────────────
  { iata: "BOM", name: "Chhatrapati Shivaji", city: "Mumbai", country: "India", keywords: ["Bombay"] },
  { iata: "CMB", name: "Bandaranaike", city: "Colombo", country: "Sri Lanka" },
  { iata: "DEL", name: "Indira Gandhi", city: "Delhi", country: "India", keywords: ["New Delhi"] },
  { iata: "MLE", name: "Velana Intl", city: "Malé", country: "Maldives", keywords: ["Maldives"] },

  // ─── Oceania ────────────────────────────────────────────────────
  { iata: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand" },
  { iata: "BNE", name: "Brisbane Airport", city: "Brisbane", country: "Australia" },
  { iata: "MEL", name: "Tullamarine", city: "Melbourne", country: "Australia" },
  { iata: "SYD", name: "Kingsford Smith", city: "Sydney", country: "Australia" },

  // ─── Africa ─────────────────────────────────────────────────────
  { iata: "ADD", name: "Bole Intl", city: "Addis Ababa", country: "Ethiopia" },
  { iata: "CAI", name: "Cairo Intl", city: "Cairo", country: "Egypt" },
  { iata: "CPT", name: "Cape Town Intl", city: "Cape Town", country: "South Africa" },
  { iata: "JNB", name: "O.R. Tambo", city: "Johannesburg", country: "South Africa" },
  { iata: "NBO", name: "Jomo Kenyatta", city: "Nairobi", country: "Kenya" },
] as const

/** O(1) lookup by IATA code. */
export const AIRPORT_BY_IATA: ReadonlyMap<string, Airport> = new Map(
  AIRPORTS.map(a => [a.iata, a]),
)
