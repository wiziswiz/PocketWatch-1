"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/net-worth",           icon: "equalizer",              label: "Net Worth" },
  { href: "/portfolio",           icon: "pie_chart",              label: "Overview" },
  { href: "/portfolio/balances",  icon: "account_balance_wallet", label: "Balances" },
  { href: "/portfolio/accounts",  icon: "wallet",                 label: "Wallets" },
]

interface MobileBottomNavProps {
  onMoreClick?: () => void
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 bg-glass-bg border-t border-glass-border flex items-center justify-around px-2 lg:hidden z-30 safe-area-bottom"
      style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/portfolio" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "mobile-nav-pill",
              isActive ? "text-primary" : "text-foreground-muted"
            )}
          >
            <div className="mobile-nav-icon-wrap">
              <span
                className={cn("material-symbols-rounded icon-xl", isActive && "filled")}
                aria-hidden="true"
              >
                {item.icon}
              </span>
            </div>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        )
      })}
      <button
        onClick={onMoreClick}
        aria-label="More navigation options"
        className="mobile-nav-pill text-foreground-muted"
      >
        <div className="mobile-nav-icon-wrap">
          <span className="material-symbols-rounded icon-xl" aria-hidden="true">menu</span>
        </div>
        <span className="text-[10px] font-medium leading-none">More</span>
      </button>
    </nav>
  )
}
