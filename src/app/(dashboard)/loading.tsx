export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 animate-shimmer" />
          <div className="h-4 w-72 animate-shimmer mt-2" />
        </div>
        <div className="h-9 w-28 animate-shimmer" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 bg-card border border-card-border rounded-xl">
            <div className="h-3 w-20 animate-shimmer mb-3" />
            <div className="h-6 w-16 animate-shimmer" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="p-6 bg-card border border-card-border rounded-xl space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-10 h-10 animate-shimmer flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 animate-shimmer w-3/4" />
              <div className="h-3 animate-shimmer w-1/2" />
            </div>
            <div className="h-4 w-16 animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  )
}
