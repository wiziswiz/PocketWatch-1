"use client"

/** Shared SVG bar sparkline used across budget components. */
export function BudgetSparkline({
  data,
  color,
  barWidth = 4,
  barGap = 2,
  height = 20,
  count = 6,
}: {
  data: number[]
  color: string
  barWidth?: number
  barGap?: number
  height?: number
  count?: number
}) {
  const last = data.slice(-count)
  if (last.length === 0) return null
  const max = Math.max(...last, 1)
  const width = last.length * (barWidth + barGap) - barGap

  return (
    <svg width={width} height={height} className="flex-shrink-0" aria-hidden="true">
      {last.map((val, i) => {
        const barH = Math.max((val / max) * height, 1)
        return (
          <rect
            key={i}
            x={i * (barWidth + barGap)}
            y={height - barH}
            width={barWidth}
            height={barH}
            rx={1}
            fill={color}
            opacity={i === last.length - 1 ? 1 : 0.4}
          />
        )
      })}
    </svg>
  )
}
