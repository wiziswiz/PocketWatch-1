/**
 * PocketLLM flight tool executors — read from DB-persisted flight search results.
 */

import { db } from "@/lib/db"
import type { DashboardResults } from "@/types/travel"

type ToolInput = Record<string, unknown>

const NO_FLIGHTS = JSON.stringify({ error: "No recent flight search found. The user needs to search for flights first." })

async function loadFlightResults(userId: string): Promise<DashboardResults | null> {
  const row = await db.flightSearchResult.findUnique({ where: { userId } })
  return row ? (row.results as unknown as DashboardResults) : null
}

export async function getFlightSearchSummary(userId: string): Promise<string> {
  const data = await loadFlightResults(userId)
  if (!data) return NO_FLIGHTS

  const flights = data.flights
  const cabinCounts: Record<string, number> = {}
  const airlineSet = new Set<string>()
  let awardCount = 0
  let cashCount = 0
  let minPoints = Infinity
  let maxPoints = -Infinity
  let minCash = Infinity
  let maxCash = -Infinity

  for (const f of flights) {
    cabinCounts[f.cabinClass] = (cabinCounts[f.cabinClass] ?? 0) + 1
    airlineSet.add(f.airline)
    if (f.type === "award") {
      awardCount++
      if (f.points != null) {
        if (f.points < minPoints) minPoints = f.points
        if (f.points > maxPoints) maxPoints = f.points
      }
    } else {
      cashCount++
      if (f.cashPrice != null) {
        if (f.cashPrice < minCash) minCash = f.cashPrice
        if (f.cashPrice > maxCash) maxCash = f.cashPrice
      }
    }
  }

  return JSON.stringify({
    route: `${data.meta.origin} → ${data.meta.destination}`,
    departureDate: data.meta.departureDate,
    searchedAt: data.meta.searchedAt,
    sources: data.meta.sources,
    totalFlights: flights.length,
    awardFlights: awardCount,
    cashFlights: cashCount,
    cabinBreakdown: cabinCounts,
    airlines: [...airlineSet].sort(),
    pointsRange: awardCount > 0 && isFinite(minPoints) ? { min: minPoints, max: maxPoints } : null,
    cashRange: cashCount > 0 && isFinite(minCash) ? { min: minCash, max: maxCash } : null,
    recommendations: data.recommendations.map((r) => ({
      title: r.title,
      subtitle: r.subtitle,
      totalCost: r.totalCost,
      cppValue: r.cppValue,
    })),
    insights: data.insights.map((i) => ({ type: i.type, priority: i.priority, title: i.title, detail: i.detail })),
    routeSweetSpots: data.routeSweetSpots,
    balances: data.balances.map((b) => ({
      program: b.program,
      balance: b.balance,
      display: b.displayBalance,
    })),
    warnings: data.warnings,
  })
}

export async function getFlightResults(userId: string, input: ToolInput): Promise<string> {
  const data = await loadFlightResults(userId)
  if (!data) return NO_FLIGHTS

  let flights = [...data.flights]

  // Apply filters
  if (input.cabin) {
    const cabin = (input.cabin as string).toLowerCase()
    flights = flights.filter((f) => f.cabinClass.toLowerCase() === cabin)
  }
  if (input.airline) {
    const airline = (input.airline as string).toLowerCase()
    flights = flights.filter((f) =>
      f.airline.toLowerCase().includes(airline) ||
      f.operatingAirlines.some((a) => a.toLowerCase().includes(airline))
    )
  }
  if (input.type) {
    flights = flights.filter((f) => f.type === input.type)
  }
  if (input.stops != null) {
    const maxStops = input.stops as number
    flights = flights.filter((f) => f.stops <= maxStops)
  }
  if (input.max_points != null) {
    const max = input.max_points as number
    flights = flights.filter((f) => f.points != null && f.points <= max)
  }
  if (input.min_value_score != null) {
    const min = input.min_value_score as number
    flights = flights.filter((f) => f.valueScore >= min)
  }

  // Sort
  const sortBy = (input.sort_by as string) || "value_score"
  const sortFns: Record<string, (a: typeof flights[0], b: typeof flights[0]) => number> = {
    value_score: (a, b) => b.valueScore - a.valueScore,
    points: (a, b) => (a.points ?? Infinity) - (b.points ?? Infinity),
    cash_price: (a, b) => (a.cashPrice ?? Infinity) - (b.cashPrice ?? Infinity),
    duration: (a, b) => a.durationMinutes - b.durationMinutes,
    cpp: (a, b) => (b.realCpp ?? 0) - (a.realCpp ?? 0),
  }
  if (sortFns[sortBy]) flights.sort(sortFns[sortBy])

  const total = flights.length
  const limit = Math.min((input.limit as number) || 10, 30)
  flights = flights.slice(0, limit)

  return JSON.stringify({
    total,
    showing: flights.length,
    flights: flights.map((f) => ({
      airline: f.airline,
      flightNumbers: f.flightNumbers,
      route: `${f.origin} → ${f.destination}`,
      airports: f.airports,
      stops: f.stops,
      duration: `${Math.floor(f.durationMinutes / 60)}h${f.durationMinutes % 60}m`,
      cabin: f.cabinClass,
      type: f.type,
      points: f.points,
      program: f.pointsProgram,
      taxes: f.taxes,
      cashPrice: f.cashPrice,
      valueScore: f.valueScore,
      cppValue: f.realCpp,
      cppRating: f.cppRating,
      canAfford: f.canAfford,
      affordDetails: f.affordDetails,
      sweetSpot: f.sweetSpotMatch?.label ?? null,
      departureTime: f.departureTime,
      arrivalTime: f.arrivalTime,
      bookingUrl: f.bookingUrl,
    })),
  })
}

/**
 * Generate a price match / negotiation email based on flight search results.
 * Finds the cheapest option and drafts a persuasive email to competing airlines.
 */
export async function generatePriceMatchEmail(userId: string, input: ToolInput): Promise<string> {
  const data = await loadFlightResults(userId)
  if (!data) return NO_FLIGHTS

  const targetAirline = (input.airline as string)?.toLowerCase() || ""
  const flights = data.flights

  // Find cheapest cash flight as the price-match reference
  const cashFlights = flights
    .filter(f => f.type === "cash" && f.cashPrice && f.cashPrice > 0)
    .sort((a, b) => (a.cashPrice || Infinity) - (b.cashPrice || Infinity))

  if (cashFlights.length === 0) {
    return JSON.stringify({ error: "No cash flights found to use as price reference." })
  }

  const cheapest = cashFlights[0]!
  const route = `${data.meta.origin} → ${data.meta.destination}`
  const date = data.meta.departureDate

  // Find the target airline's flights (or the most expensive one)
  const targetFlights = targetAirline
    ? flights.filter(f => f.type === "cash" && f.airline.toLowerCase().includes(targetAirline))
    : cashFlights.filter(f => f.cashPrice && f.cashPrice > cheapest.cashPrice!)

  const target = targetFlights[0]
  const priceDiff = target?.cashPrice ? target.cashPrice - (cheapest.cashPrice || 0) : 0

  return JSON.stringify({
    route,
    date,
    cheapestFlight: {
      airline: cheapest.airline,
      price: cheapest.cashPrice,
      cabin: cheapest.cabinClass,
      stops: cheapest.stops,
    },
    targetFlight: target ? {
      airline: target.airline,
      price: target.cashPrice,
      cabin: target.cabinClass,
      priceDifference: priceDiff,
    } : null,
    emailTemplate: [
      `Subject: Price Match Request — ${route} on ${date}`,
      "",
      `Dear ${target?.airline || "[Airline]"} Customer Service,`,
      "",
      `I am writing to request a price match for my upcoming flight from ${data.meta.origin} to ${data.meta.destination} on ${date}.`,
      "",
      `I found a comparable ${cheapest.cabinClass} class fare on ${cheapest.airline} for $${cheapest.cashPrice}, which is $${priceDiff} less than your current fare of $${target?.cashPrice || "[your price]"}.`,
      "",
      `As a loyal customer, I would prefer to fly with ${target?.airline || "[your airline]"} and would appreciate if you could match or come close to this competitor pricing.`,
      "",
      `Competitor details:`,
      `- Airline: ${cheapest.airline}`,
      `- Route: ${route}`,
      `- Date: ${date}`,
      `- Price: $${cheapest.cashPrice}`,
      `- Cabin: ${cheapest.cabinClass}`,
      `- Stops: ${cheapest.stops === 0 ? "Nonstop" : `${cheapest.stops} stop(s)`}`,
      "",
      `I would be happy to provide a screenshot of the competitor fare if needed.`,
      "",
      `Thank you for your time and consideration.`,
      "",
      `Best regards`,
    ].join("\n"),
    tip: "Most airlines have a price match window of 24-48 hours after booking. Some airlines (Southwest, JetBlue) have more flexible price match policies than legacy carriers.",
  })
}

/**
 * Analyze fare flexibility and estimated fees for a specific flight.
 */
export async function analyzeFareDetails(userId: string, input: ToolInput): Promise<string> {
  const data = await loadFlightResults(userId)
  if (!data) return NO_FLIGHTS

  const { analyzeFareFlexibility, extractAirlineCode } = await import("@/lib/travel/fare-flexibility")
  const { estimateAirlineFees, extractFirstIATA } = await import("@/lib/travel/airline-fees")

  const airline = (input.airline as string)?.toLowerCase() || ""
  const cabin = (input.cabin as string)?.toLowerCase() || ""

  let flights = data.flights
  if (airline) flights = flights.filter(f => f.airline.toLowerCase().includes(airline))
  if (cabin) flights = flights.filter(f => f.cabinClass.toLowerCase() === cabin)

  const analyzed = flights.slice(0, 10).map(f => {
    const flex = analyzeFareFlexibility(f.fareClass, extractAirlineCode(f.airline))
    const iata = extractFirstIATA(f.operatingAirlines, f.airline)
    const fees = f.type === "cash" ? estimateAirlineFees(iata) : null

    return {
      airline: f.airline,
      fareClass: f.fareClass,
      cabin: f.cabinClass,
      type: f.type,
      price: f.type === "cash" ? `$${f.cashPrice}` : `${f.points?.toLocaleString()} pts`,
      flexibility: flex ? {
        level: flex.level,
        label: flex.label,
        refundable: flex.refundable,
        changeable: flex.changeable,
        changeFee: flex.changeFeeTier,
      } : "Unknown fare class",
      estimatedFees: fees && fees.total > 0 ? {
        checkedBag: fees.checkedBag ? `$${fees.checkedBag}` : "Free",
        carryOn: fees.carryOn ? `$${fees.carryOn}` : "Free",
        seatSelection: fees.seatSelection ? `$${fees.seatSelection}` : "Included",
        totalExtra: `$${fees.total}`,
      } : "No additional fees expected",
    }
  })

  return JSON.stringify({ count: analyzed.length, flights: analyzed })
}
