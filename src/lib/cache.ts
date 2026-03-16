// Use globalThis to persist cache across HMR module reloads in dev mode.
const g = globalThis as unknown as { __pwCache?: Map<string, { data: unknown; expiry: number }> }
if (!g.__pwCache) {
  g.__pwCache = new Map()
  // Periodically evict expired entries to prevent unbounded memory growth.
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of g.__pwCache!.entries()) {
        if (now > entry.expiry) g.__pwCache!.delete(key)
      }
    }, 5 * 60_000)
  }
}
const cache = g.__pwCache

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs })
}

export function invalidateCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}
