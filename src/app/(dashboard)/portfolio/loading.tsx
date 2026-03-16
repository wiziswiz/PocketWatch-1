export default function PortfolioLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-36 animate-shimmer border border-card-border rounded-xl" />
          <div className="h-8 w-44 animate-shimmer border border-card-border rounded-xl mt-2" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 w-10 animate-shimmer border border-card-border rounded-lg" />
          ))}
        </div>
      </div>
      <div className="p-4 bg-card border border-card-border rounded-xl">
        <div className="h-[240px] animate-shimmer rounded-lg" />
      </div>
      <div className="h-6 w-full animate-shimmer border border-card-border rounded-full" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 p-3 bg-card border border-card-border rounded-xl">
          <div className="w-8 h-8 animate-shimmer rounded-full flex-shrink-0" />
          <div className="flex-1 h-4 animate-shimmer rounded-lg" />
          <div className="h-4 w-24 animate-shimmer rounded-lg" />
        </div>
      ))}
    </div>
  )
}
