"use client"

import { useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface ScrollHintWrapperProps {
  children: React.ReactNode
  className?: string
}

/**
 * Wraps a horizontally-scrollable element (table, card row) with a right-edge
 * fade indicator on mobile. Fades out when the user scrolls to the end.
 */
export function ScrollHintWrapper({ children, className }: ScrollHintWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)

  const checkScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    el.classList.toggle("scrolled-end", atEnd)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    checkScroll()
    el.addEventListener("scroll", checkScroll, { passive: true })
    window.addEventListener("resize", checkScroll)
    return () => {
      el.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [checkScroll])

  return (
    <div ref={ref} className={cn("scroll-hint", className)}>
      {children}
    </div>
  )
}
