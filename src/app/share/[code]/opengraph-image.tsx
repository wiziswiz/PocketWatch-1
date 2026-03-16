import { ImageResponse } from "next/og"
import { decodeShareStats, buildReceiptLines } from "@/lib/share-stats"

export const runtime = "edge"
export const alt = "PocketWatch Flex Card"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const LOGO_D = "M3 2.5A1.5 1.5 0 0 1 4.5 1h1A1.5 1.5 0 0 1 7 2.5V5h2V2.5A1.5 1.5 0 0 1 10.5 1h1A1.5 1.5 0 0 1 13 2.5v2.382a.5.5 0 0 0 .276.447l.895.447A1.5 1.5 0 0 1 15 7.118V14.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 14.5v-3a.5.5 0 0 1 .146-.354l.854-.853V9.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v.793l.854.853A.5.5 0 0 1 7 11.5v3A1.5 1.5 0 0 1 5.5 16h-3A1.5 1.5 0 0 1 1 14.5V7.118a1.5 1.5 0 0 1 .83-1.342l.894-.447A.5.5 0 0 0 3 4.882zM4.5 2a.5.5 0 0 0-.5.5V3h2v-.5a.5.5 0 0 0-.5-.5zM6 4H4v.882a1.5 1.5 0 0 1-.83 1.342l-.894.447A.5.5 0 0 0 2 7.118V13h4v-1.293l-.854-.853A.5.5 0 0 1 5 10.5v-1A1.5 1.5 0 0 1 6.5 8h3A1.5 1.5 0 0 1 11 9.5v1a.5.5 0 0 1-.146.354l-.854.853V13h4V7.118a.5.5 0 0 0-.276-.447l-.895-.447A1.5 1.5 0 0 1 12 4.882V4h-2v1.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5zm4-1h2v-.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5zm4 11h-4v.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5zm-8 0H2v.5a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5z"

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const stats = decodeShareStats(code)

  if (!stats) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f4f5", color: "#18181b", fontSize: 32 }}>
        PocketWatch
      </div>,
      { ...size },
    )
  }

  const lines = buildReceiptLines(stats)

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f4f5",
        padding: "32px 48px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          border: "1px solid #e4e4e7",
          borderRadius: 20,
          padding: "40px 52px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="32" height="32" viewBox="0 0 16 16" fill="#18181b">
              <path d={LOGO_D} />
            </svg>
            <span style={{ color: "#18181b", fontSize: 24, fontWeight: 600 }}>
              PocketWatch
            </span>
          </div>
          <span style={{ color: "#a1a1aa", fontSize: 14, fontWeight: 500, letterSpacing: "0.15em" }}>
            FLEX CARD
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#e4e4e7", marginBottom: 8 }} />

        {/* Receipt lines */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 0",
                borderTop: i > 0 ? "1px solid #f4f4f5" : "none",
              }}
            >
              <span style={{ color: "#6b7280", fontSize: 20, fontWeight: 400 }}>
                {line.label}
              </span>
              <span
                style={{
                  color: line.accent ?? "#18181b",
                  fontSize: 20,
                  fontWeight: 600,
                  fontFamily: "monospace",
                }}
              >
                {line.value}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <span style={{ color: "#a1a1aa", fontSize: 14 }}>
            PocketWatch · Open Source · Private · Self-Hosted
          </span>
        </div>
      </div>
    </div>,
    { ...size },
  )
}
