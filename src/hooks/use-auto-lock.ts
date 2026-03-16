"use client"

import { useEffect, useRef } from "react"

/**
 * Auto-lock hook: monitors user activity and locks the session after idle timeout.
 * @param timeoutMinutes - Minutes of inactivity before lock. null or 0 = disabled.
 */
export function useAutoLock(timeoutMinutes: number | null): void {
  const lastActivityRef = useRef(Date.now())
  const throttleRef = useRef(0)

  useEffect(() => {
    if (!timeoutMinutes || timeoutMinutes <= 0) return

    const timeoutMs = timeoutMinutes * 60_000

    const resetActivity = () => {
      const now = Date.now()
      // Throttle to 1 update per second to avoid excessive ref writes
      if (now - throttleRef.current < 1_000) return
      throttleRef.current = now
      lastActivityRef.current = now
    }

    const events: Array<keyof DocumentEventMap> = [
      "mousemove",
      "keydown",
      "touchstart",
      "click",
      "scroll",
    ]

    for (const event of events) {
      document.addEventListener(event, resetActivity, { passive: true })
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= timeoutMs) {
        clearInterval(interval)
        for (const event of events) {
          document.removeEventListener(event, resetActivity)
        }
        fetch("/api/auth/lock", { method: "POST" })
          .catch(() => {})
          .finally(() => {
            window.location.href = "/"
          })
      }
    }, 15_000)

    return () => {
      clearInterval(interval)
      for (const event of events) {
        document.removeEventListener(event, resetActivity)
      }
    }
  }, [timeoutMinutes])
}
