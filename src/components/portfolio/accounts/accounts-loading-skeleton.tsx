export function AccountsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-card border border-card-border p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 animate-shimmer rounded flex-shrink-0" />
            <div className="flex-1 min-w-0 h-5 animate-shimmer rounded" />
            <div className="w-20 h-4 animate-shimmer rounded" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-6 w-16 animate-shimmer rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
