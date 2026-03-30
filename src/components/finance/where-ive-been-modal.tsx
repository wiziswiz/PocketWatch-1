"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "motion/react"
import { formatCurrency } from "@/lib/utils"
import { useTransactionLocations } from "@/hooks/finance/use-locations"
import { WhereIveBeenMap } from "./where-ive-been-map"
import { WhereIveBeenStats } from "./where-ive-been-stats"

interface Props {
  open: boolean
  onClose: () => void
}

export function WhereIveBeenModal({ open, onClose }: Props) {
  const { data, isLoading } = useTransactionLocations()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [open])

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full h-full max-w-[1440px] max-h-[900px] bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-card-border/50"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 350, mass: 0.8 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border/50 bg-card z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-rounded text-primary" style={{ fontSize: 20 }}>public</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Where I've Been</h2>
                  {data && (
                    <motion.p
                      className="text-[11px] text-foreground-muted"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {data.stats.countryCount} {data.stats.countryCount === 1 ? "country" : "countries"} &middot; {data.stats.cityCount} {data.stats.cityCount === 1 ? "city" : "cities"} &middot; {data.stats.transactionCount.toLocaleString()} transactions &middot; {formatCurrency(data.stats.totalSpent)} spent
                    </motion.p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            {/* Body */}
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center bg-background-secondary/30">
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="h-12 w-12 mx-auto mb-4 border-2 border-foreground-muted/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-foreground-muted">Mapping your transactions...</p>
                </motion.div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                {/* Map */}
                <motion.div
                  className="flex-1 min-h-[350px] lg:min-h-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <WhereIveBeenMap locations={data?.locations ?? []} />
                </motion.div>

                {/* Stats sidebar */}
                <motion.div
                  className="w-full lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-card-border/50 flex flex-col max-h-[250px] lg:max-h-none bg-card"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                >
                  <div className="px-4 py-3 border-b border-card-border/30 flex-shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground-muted">By Country</span>
                  </div>
                  <WhereIveBeenStats locations={data?.locations ?? []} />
                </motion.div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Portal to body to escape CSS containment
  if (typeof document === "undefined") return null
  return createPortal(content, document.body)
}
