"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

type InsightVariant = "info" | "warning" | "success" | "danger"

interface InsightCardProps {
  icon: string
  title: string
  description: string
  variant?: InsightVariant
  actionLink?: { label: string; href: string }
  className?: string
}

const variantColors: Record<InsightVariant, string> = {
  info: "var(--primary)",
  warning: "var(--warning)",
  success: "var(--success)",
  danger: "var(--error)",
}

export function InsightCard({
  icon,
  title,
  description,
  variant = "info",
  actionLink,
  className,
}: InsightCardProps) {
  const color = variantColors[variant]

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-card border border-card-border p-4 flex gap-3",
        "hover:translate-y-[-1px] hover:shadow-md transition-all duration-200",
        className
      )}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${color}, transparent 70%)`,
          opacity: 0.03,
        }}
      />
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 drop-shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 80%, #000))`,
        }}
      >
        <span className="material-symbols-rounded text-white" style={{ fontSize: 20 }}>
          {icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-foreground-muted mt-0.5 leading-relaxed">{description}</p>
        {actionLink && (
          <Link
            href={actionLink.href}
            className="inline-block mt-2 text-xs font-medium transition-colors"
            style={{ color }}
          >
            {actionLink.label} &rarr;
          </Link>
        )}
      </div>
    </div>
  )
}
