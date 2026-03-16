import type { CategoryMeta } from "@/lib/finance/categories"

export function GradIcon({ meta, size = 32, icon = 15 }: { meta: CategoryMeta; size?: number; icon?: number }) {
  return (
    <div className="rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${meta.hex}, color-mix(in srgb, ${meta.hex} 80%, #000))` }}>
      <span className="material-symbols-rounded text-white drop-shadow-sm" style={{ fontSize: icon }}>{meta.icon}</span>
    </div>
  )
}

export function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-")
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function formatDateLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
