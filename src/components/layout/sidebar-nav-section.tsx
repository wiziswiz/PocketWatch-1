"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { NavItem } from "@/hooks/use-sidebar-prefs"

interface SidebarNavSectionProps {
  label: string
  items: NavItem[]
  pathname: string
  baseHref: string
  onClose?: () => void
}

export function SidebarNavSection({ label, items, pathname, baseHref, onClose }: SidebarNavSectionProps) {
  return (
    <>
      {label && (
        <div className="px-3 mb-3">
          <p className="text-[10px] font-semibold tracking-widest text-foreground-muted uppercase">
            {label}
          </p>
        </div>
      )}

      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== baseHref && pathname.startsWith(item.href))

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onClose}
            className={cn(
              "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "text-primary bg-primary-muted"
                : "text-foreground-muted hover:text-foreground hover:bg-background-secondary"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full -ml-1" />
            )}
            <span
              className={cn("material-symbols-rounded text-[18px] flex-shrink-0", isActive && "filled")}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </>
  )
}
