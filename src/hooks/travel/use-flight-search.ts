/**
 * Flight search hook — manages SSE connection for long-running searches.
 * Uses fetch + ReadableStream instead of EventSource for proper error handling.
 */

import { useState, useCallback, useRef, useEffect } from "react"
import type { DashboardResults, SearchProgressEvent, SearchConfig } from "@/types/travel"

// ─── Recent Searches ────────────────────────────────────────────

const RECENT_SEARCHES_KEY = "pw-travel-recent-searches"
const MAX_RECENT = 10

export interface RecentSearch {
  origin: string
  destination: string
  date: string
  searchClass: SearchConfig["searchClass"]
  tripType?: "one_way" | "round_trip"
  returnDate?: string
  flexDates?: boolean
  origins?: string[]
  destinations?: string[]
  timestamp: number
}

function loadRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    return raw ? (JSON.parse(raw) as RecentSearch[]) : []
  } catch {
    return []
  }
}

function saveRecentSearch(config: SearchConfig) {
  try {
    const existing = loadRecentSearches()
    const entry: RecentSearch = {
      origin: config.origin,
      destination: config.destination,
      date: config.departureDate,
      searchClass: config.searchClass,
      tripType: config.tripType,
      returnDate: config.returnDate,
      flexDates: config.flexDates,
      origins: config.origins,
      destinations: config.destinations,
      timestamp: Date.now(),
    }
    // Remove duplicate if exists
    const filtered = existing.filter(
      (s) => !(s.origin === entry.origin && s.destination === entry.destination && s.date === entry.date),
    )
    const updated = [entry, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  } catch {
    // quota exceeded — ignore
  }
}

type SearchStatus = "idle" | "searching" | "complete" | "error"

interface FlightSearchState {
  status: SearchStatus
  progress: SearchProgressEvent[]
  results: DashboardResults | null
  error: string | null
}

function parseSSEChunk(chunk: string): { event: string; data: string }[] {
  const events: { event: string; data: string }[] = []
  const blocks = chunk.split("\n\n").filter(Boolean)
  for (const block of blocks) {
    let event = ""
    let data = ""
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7)
      else if (line.startsWith("data: ")) data = line.slice(6)
    }
    if (event && data) events.push({ event, data })
  }
  return events
}

export function useFlightSearch() {
  const [state, setState] = useState<FlightSearchState>({
    status: "idle",
    progress: [],
    results: null,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])

  useEffect(() => {
    setRecentSearches(loadRecentSearches())
  }, [])

  const search = useCallback((config: SearchConfig) => {
    // Cancel any in-flight search
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Save to recent searches
    saveRecentSearch(config)
    setRecentSearches(loadRecentSearches())

    setState({ status: "searching", progress: [], results: null, error: null })

    // Build origin/destination as comma-separated if multi-airport
    const originParam = config.origins?.length ? config.origins.join(",") : config.origin
    const destParam = config.destinations?.length ? config.destinations.join(",") : config.destination

    const params = new URLSearchParams({
      origin: originParam,
      destination: destParam,
      date: config.departureDate,
      class: config.searchClass,
    })
    if (config.tripType) params.set("tripType", config.tripType)
    if (config.returnDate) params.set("returnDate", config.returnDate)
    if (config.flexDates) params.set("flexDates", "true")

    ;(async () => {
      try {
        const res = await fetch(`/api/travel/search?${params}`, {
          credentials: "include",
          signal: controller.signal,
        })

        // Non-SSE response = API returned a JSON error
        if (!res.ok || !res.headers.get("content-type")?.includes("text/event-stream")) {
          const body = await res.json().catch(() => ({ error: `Request failed: ${res.status}` }))
          setState(prev => ({ ...prev, status: "error", error: body.error ?? `Search failed (${res.status})` }))
          return
        }

        const reader = res.body?.getReader()
        if (!reader) {
          setState(prev => ({ ...prev, status: "error", error: "No response stream" }))
          return
        }

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Only parse complete SSE blocks (terminated by \n\n)
          const lastDoubleNewline = buffer.lastIndexOf("\n\n")
          if (lastDoubleNewline < 0) continue

          const completePart = buffer.slice(0, lastDoubleNewline + 2)
          buffer = buffer.slice(lastDoubleNewline + 2)

          const events = parseSSEChunk(completePart)

          for (const evt of events) {
            if (evt.event === "progress") {
              const data = JSON.parse(evt.data) as SearchProgressEvent
              setState(prev => ({ ...prev, progress: [...prev.progress, data] }))
            } else if (evt.event === "result") {
              const data = JSON.parse(evt.data) as DashboardResults
              setState(prev => ({ ...prev, status: "complete", results: data }))
            } else if (evt.event === "error") {
              const data = JSON.parse(evt.data) as { error: string }
              setState(prev => ({ ...prev, status: "error", error: data.error }))
            }
          }
        }

        // Parse any remaining complete events in the buffer after stream ends
        if (buffer.trim()) {
          const events = parseSSEChunk(buffer)
          for (const evt of events) {
            if (evt.event === "result") {
              const data = JSON.parse(evt.data) as DashboardResults
              setState(prev => ({ ...prev, status: "complete", results: data }))
            } else if (evt.event === "error") {
              const data = JSON.parse(evt.data) as { error: string }
              setState(prev => ({ ...prev, status: "error", error: data.error }))
            }
          }
        }

        // If stream ended without a result or error event, mark as error
        setState(prev => {
          if (prev.status === "searching") {
            return { ...prev, status: "error", error: "Search ended without results" }
          }
          return prev
        })
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setState(prev => ({
          ...prev,
          status: "error",
          error: (err as Error).message || "Search connection failed",
        }))
      }
    })()
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setState(prev => ({ ...prev, status: "idle" }))
  }, [])

  return {
    ...state,
    search,
    cancel,
    isSearching: state.status === "searching",
    recentSearches,
  }
}
