import { cn } from "@/lib/utils"
import { getCategoryMeta } from "@/lib/finance/categories"

interface CategoryBadgeProps {
  category: string | null
  showIcon?: boolean
  className?: string
}

export function CategoryBadge({ category, showIcon = true, className }: CategoryBadgeProps) {
  const cat = category ?? "Uncategorized"
  const meta = getCategoryMeta(cat)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        className,
      )}
      style={{
        backgroundColor: `${meta.hex}18`,
        color: meta.hex,
      }}
    >
      {showIcon && (
        <span className="material-symbols-rounded" style={{ fontSize: 13 }}>
          {meta.icon}
        </span>
      )}
      {cat}
    </span>
  )
}
