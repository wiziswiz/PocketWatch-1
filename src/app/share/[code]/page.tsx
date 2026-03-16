import type { Metadata } from "next"
import { decodeShareStats, buildReceiptLines } from "@/lib/share-stats"

interface SharePageProps {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { code } = await params
  const stats = decodeShareStats(code)
  const desc = stats
    ? `Financial Health Score: ${stats.g} (${stats.s}/100) | OnlyFans Subscriber: ${stats.gn ? "POSITIVE" : "NEGATIVE"} | Savings Found: $${stats.sv.toLocaleString()}/yr`
    : "See everything you own. In one place."

  return {
    title: "PocketWatch Flex Card",
    description: desc,
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { code } = await params
  const stats = decodeShareStats(code)

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f4f4f5" }}>
        <p className="text-lg" style={{ color: "#a1a1aa" }}>Invalid share link</p>
      </div>
    )
  }

  const lines = buildReceiptLines(stats)

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#f4f4f5" }}
    >
      <div className="w-full max-w-lg">
        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden mb-8 shadow-lg"
          style={{
            background: "#ffffff",
            border: "1px solid #e4e4e7",
          }}
        >
          <div className="px-8 pt-7 pb-5">
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <svg width="32" height="32" viewBox="0 0 16 16" fill="#18181b">
                <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1h1A1.5 1.5 0 0 1 7 2.5V5h2V2.5A1.5 1.5 0 0 1 10.5 1h1A1.5 1.5 0 0 1 13 2.5v2.382a.5.5 0 0 0 .276.447l.895.447A1.5 1.5 0 0 1 15 7.118V14.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 14.5v-3a.5.5 0 0 1 .146-.354l.854-.853V9.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v.793l.854.853A.5.5 0 0 1 7 11.5v3A1.5 1.5 0 0 1 5.5 16h-3A1.5 1.5 0 0 1 1 14.5V7.118a1.5 1.5 0 0 1 .83-1.342l.894-.447A.5.5 0 0 0 3 4.882zM4.5 2a.5.5 0 0 0-.5.5V3h2v-.5a.5.5 0 0 0-.5-.5zM6 4H4v.882a1.5 1.5 0 0 1-.83 1.342l-.894.447A.5.5 0 0 0 2 7.118V13h4v-1.293l-.854-.853A.5.5 0 0 1 5 10.5v-1A1.5 1.5 0 0 1 6.5 8h3A1.5 1.5 0 0 1 11 9.5v1a.5.5 0 0 1-.146.354l-.854.853V13h4V7.118a.5.5 0 0 0-.276-.447l-.895-.447A1.5 1.5 0 0 1 12 4.882V4h-2v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5zm4-1h2v-.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5zm4 11h-4v.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5zm-8 0H2v.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5z" />
              </svg>
              <div>
                <h1 className="text-xl font-semibold" style={{ color: "#18181b" }}>PocketWatch</h1>
                <p className="text-[11px] tracking-[0.15em]" style={{ color: "#a1a1aa" }}>FLEX CARD</p>
              </div>
            </div>

            <div className="h-px mb-3" style={{ background: "#e4e4e7" }} />

            {/* Lines */}
            {lines.map((line, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3.5"
                style={{ borderTop: i > 0 ? "1px solid #f4f4f5" : "none" }}
              >
                <span className="text-[15px]" style={{ color: "#6b7280" }}>{line.label}</span>
                <span className="text-[15px] font-semibold font-mono" style={{ color: line.accent ?? "#18181b" }}>{line.value}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="py-3.5 text-center" style={{ borderTop: "1px solid #f4f4f5" }}>
            <span className="text-xs" style={{ color: "#a1a1aa" }}>PocketWatch · Open Source · Private · Self-Hosted</span>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="https://github.com/viperrcrypto/pocketwatch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 shadow-md"
            style={{ background: "#18181b", color: "#ffffff" }}
          >
            Get Your Receipt
          </a>
        </div>
      </div>
    </div>
  )
}
