/**
 * Shared fetch helper and query key factory for Travel hooks.
 */

export async function travelFetch<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = 60_000, ...fetchOptions } = options ?? {}
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`/api/travel${path}`, {
      ...fetchOptions,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions?.headers,
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? `Request failed: ${res.status}`)
    }

    return res.json() as Promise<T>
  } finally {
    clearTimeout(timeout)
  }
}

export const travelKeys = {
  all: ["travel"] as const,
  credentials: () => [...travelKeys.all, "credentials"] as const,
  balances: () => [...travelKeys.all, "balances"] as const,
  search: (origin: string, dest: string, date: string) =>
    [...travelKeys.all, "search", origin, dest, date] as const,
}
