/**
 * Search Orchestrator — runs Roame + Google Flights in parallel,
 * scores results with value engine, generates recommendations.
 */

import type {
  SearchConfig,
  RoameCredentials,
  PointsBalance,
  DashboardResults,
  Recommendation,
  UnifiedFlightResult,
  ValueScoredFlight,
} from "@/types/travel"
import { searchRoame, roameFaresToUnified } from "./roame-client"
import { searchGoogleFlights } from "./google-flights-client"
import { searchATF } from "./atf-client"
import { scoreFlights } from "./value-engine"
import { getSweetSpotsForRoute } from "./sweet-spots"

// ─── Progress Callback ──────────────────────────────────────────

export interface SearchProgress {
  source: string
  status: "searching" | "complete" | "failed"
  flights?: number
  error?: string
}

interface SearchCredentials {
  roameSession?: RoameCredentials
  serpApiKey?: string
  atfApiKey?: string
}

// ─── Recommendation Engine ──────────────────────────────────────

function generateRecommendations(
  flights: ValueScoredFlight[],
  _balances: PointsBalance[],
): Recommendation[] {
  const recommendations: Recommendation[] = []

  // #1: Best value award
  const bestValueAwards = flights
    .filter(f => f.type === "award" && f.realCpp !== null && f.realCpp > 0 && f.canAfford)
    .sort((a, b) => (b.realCpp || 0) - (a.realCpp || 0))

  if (bestValueAwards.length > 0) {
    const best = bestValueAwards[0]!
    const cppLabel = best.cashSource === "exact-match" ? "(vs actual cash)" :
                     best.cashSource === "same-cabin" ? "(vs avg cash)" : "(est.)"
    const sweetSpotTag = best.sweetSpotMatch ? " SWEET SPOT" : ""

    recommendations.push({
      rank: 1,
      title: `${best.pointsProgram} → ${best.airline}${sweetSpotTag}`,
      subtitle: `${best.cabinClass} class via ${best.airports.join("→")}`,
      details: [
        `${best.flightNumbers.join(" / ")}`,
        `${Math.floor(best.durationMinutes / 60)}h${best.durationMinutes % 60}m, ${best.stops} stop${best.stops !== 1 ? "s" : ""}`,
        `Cash comparable: $${best.cashComparable?.toLocaleString()} ${cppLabel}`,
        best.affordDetails,
        ...(best.sweetSpotMatch ? [best.sweetSpotMatch.spot.description.slice(0, 80)] : []),
      ],
      totalCost: `${(best.points || 0).toLocaleString()} pts + $${best.taxes}`,
      cppValue: `${best.realCpp}c/pt`,
      bookingUrl: best.bookingUrl,
      badgeText: "#1 BEST VALUE",
      badgeColor: "emerald",
    })
  }

  // #2: Best product (premium cabin + high value score)
  const alreadyUsed = bestValueAwards[0]?.id
  const bestPremium = flights
    .filter(f =>
      f.type === "award" &&
      (f.cabinClass === "business" || f.cabinClass === "first") &&
      f.canAfford &&
      f.id !== alreadyUsed
    )
    .sort((a, b) => b.valueScore - a.valueScore)[0]

  if (bestPremium) {
    recommendations.push({
      rank: 2,
      title: `${bestPremium.pointsProgram} → ${bestPremium.airline}`,
      subtitle: `${bestPremium.cabinClass} class • ${bestPremium.airports.join("→")}`,
      details: [
        bestPremium.flightNumbers.join(" / "),
        `Value Score: ${bestPremium.valueScore}/100`,
        bestPremium.realCpp ? `${bestPremium.realCpp}c/pt vs $${bestPremium.cashComparable?.toLocaleString()} cash` : "",
        `${Math.floor(bestPremium.durationMinutes / 60)}h${bestPremium.durationMinutes % 60}m`,
      ].filter(Boolean),
      totalCost: `${(bestPremium.points || 0).toLocaleString()} pts + $${bestPremium.taxes}`,
      cppValue: bestPremium.realCpp ? `${bestPremium.realCpp}c/pt` : null,
      bookingUrl: bestPremium.bookingUrl,
      badgeText: "#2 BEST PRODUCT",
      badgeColor: "accent",
    })
  }

  // #3: Cash option
  const cheapestCash = flights
    .filter(f => f.type === "cash" && f.cashPrice && f.cashPrice > 0)
    .sort((a, b) => (a.cashPrice || Infinity) - (b.cashPrice || Infinity))[0]

  if (cheapestCash) {
    const bestAwardCpp = bestValueAwards[0]?.realCpp || 0
    const cashWins = bestAwardCpp < 1.5

    recommendations.push({
      rank: 3,
      title: `Cash ${cheapestCash.cabinClass} at $${cheapestCash.cashPrice?.toLocaleString()}`,
      subtitle: `${cheapestCash.airline} • ${cheapestCash.stops === 0 ? "Nonstop" : `${cheapestCash.stops} stop`}`,
      details: [
        cheapestCash.flightNumbers.join(" / "),
        cashWins
          ? `Cash wins — best award is only ${bestAwardCpp}c/pt, save points for a better route`
          : `Points get ${bestAwardCpp}c/pt value here — use them`,
      ],
      totalCost: `$${cheapestCash.cashPrice?.toLocaleString()}`,
      cppValue: null,
      bookingUrl: cheapestCash.bookingUrl,
      badgeText: cashWins ? "#3 CASH WINS" : "#3 SAVE POINTS",
      badgeColor: "gold",
    })
  }

  return recommendations
}

// ─── Warning Generation ─────────────────────────────────────────

function generateWarnings(balances: PointsBalance[]): string[] {
  const warnings: string[] = []

  const alaska = balances.find(b => b.programKey === "ALASKA")
  if (alaska && alaska.balance < 100000) {
    warnings.push(`Alaska only has ${alaska.balance.toLocaleString()} — enough for ~1 business OW or 1 economy RT`)
  }
  return warnings
}

// ─── Main Orchestrator ──────────────────────────────────────────

export async function runSearch(
  config: SearchConfig,
  credentials: SearchCredentials,
  balances: PointsBalance[],
  onProgress?: (progress: SearchProgress) => void,
): Promise<DashboardResults> {
  const completionPct: Record<string, number> = {}
  const allFlights: UnifiedFlightResult[] = []

  const promises: Promise<void>[] = []

  // Roame search
  if (credentials.roameSession) {
    const classes = config.searchClass === "both" ? ["ECON", "PREM"] : [config.searchClass]
    for (const cls of classes) {
      promises.push(
        (async () => {
          onProgress?.({ source: "roame", status: "searching" })
          const { fares, percentCompleted } = await searchRoame(
            credentials.roameSession!, config.origin, config.destination,
            config.departureDate, cls,
          )
          const unified = roameFaresToUnified(fares, cls)
          allFlights.push(...unified)
          completionPct["roame"] = percentCompleted
          onProgress?.({ source: "roame", status: "complete", flights: unified.length })
        })().catch(err => {
          completionPct["roame"] = 0
          onProgress?.({ source: "roame", status: "failed", error: (err as Error).message })
        })
      )
    }
  }

  // Google Flights via SerpAPI
  if (credentials.serpApiKey) {
    promises.push(
      (async () => {
        onProgress?.({ source: "google", status: "searching" })
        const flights = await searchGoogleFlights(credentials.serpApiKey!, config)
        allFlights.push(...flights)
        completionPct["google"] = flights.length > 0 ? 100 : 0
        onProgress?.({ source: "google", status: "complete", flights: flights.length })
      })().catch(err => {
        completionPct["google"] = 0
        onProgress?.({ source: "google", status: "failed", error: (err as Error).message })
      })
    )
  }

  // ATF (Award Travel Finder)
  if (credentials.atfApiKey) {
    promises.push(
      (async () => {
        onProgress?.({ source: "atf", status: "searching" })
        const flights = await searchATF(
          credentials.atfApiKey!, config.origin, config.destination, config.departureDate,
        )
        // Cross-reference: tag ATF flights that match Roame results
        for (const f of flights) {
          const roameMatch = allFlights.find(
            r => r.source === "roame" &&
              r.pointsProgram === f.pointsProgram &&
              r.cabinClass === f.cabinClass &&
              r.travelDate === f.travelDate
          )
          f.tags = roameMatch ? ["cross-verified"] : ["ATF-exclusive"]
        }
        allFlights.push(...flights)
        completionPct["atf"] = flights.length > 0 ? 100 : 0
        onProgress?.({ source: "atf", status: "complete", flights: flights.length })
      })().catch(err => {
        completionPct["atf"] = 0
        onProgress?.({ source: "atf", status: "failed", error: (err as Error).message })
      })
    )
  }

  await Promise.allSettled(promises)

  // Run value engine
  const { scored, insights } = scoreFlights(allFlights, balances, config.origin, config.destination)
  scored.sort((a, b) => b.valueScore - a.valueScore)

  const recommendations = generateRecommendations(scored, balances)
  const warnings = generateWarnings(balances)
  const routeSpots = getSweetSpotsForRoute(config.origin, config.destination)
  const routeSweetSpots = routeSpots.map(s => ({
    program: s.programName,
    cabin: s.cabin,
    maxPoints: s.maxPoints,
    description: s.description,
  }))

  return {
    meta: {
      origin: config.origin,
      destination: config.destination,
      departureDate: config.departureDate,
      searchedAt: new Date().toISOString(),
      sources: Object.keys(completionPct),
      completionPct,
    },
    balances,
    flights: scored,
    recommendations,
    insights,
    routeSweetSpots,
    warnings,
  }
}
