"use client"

import { useState } from "react"
import { CardGalleryItem } from "./card-gallery-item"

const ISSUER_COLORS: Record<string, string> = {
  chase: "#1e3a8a",
  amex: "#016FD0",
  "american express": "#016FD0",
  citi: "#003B70",
  "capital one": "#991b1b",
  discover: "#FF6000",
  "wells fargo": "#8b0000",
  "bank of america": "#E31837",
  barclays: "#00AEEF",
  usaa: "#00529B",
  "us bank": "#D71E28",
}

const ISSUER_SHORT: Record<string, string> = {
  chase: "CHASE",
  amex: "AMEX",
  "american express": "AMEX",
  citi: "CITI",
  "capital one": "C1",
  discover: "DISC",
  "wells fargo": "WF",
  "bank of america": "BOA",
  barclays: "BARC",
  usaa: "USAA",
  "us bank": "USB",
}

const ISSUER_LOGO: Record<string, string> = {
  chase: "https://logo.clearbit.com/chase.com",
  amex: "https://logo.clearbit.com/americanexpress.com",
  "american express": "https://logo.clearbit.com/americanexpress.com",
  citi: "https://logo.clearbit.com/citi.com",
  "capital one": "https://logo.clearbit.com/capitalone.com",
  discover: "https://logo.clearbit.com/discover.com",
  "wells fargo": "https://logo.clearbit.com/wellsfargo.com",
  "bank of america": "https://logo.clearbit.com/bankofamerica.com",
  barclays: "https://logo.clearbit.com/barclays.com",
  usaa: "https://logo.clearbit.com/usaa.com",
  "us bank": "https://logo.clearbit.com/usbank.com",
}

function IssuerBadge({ issuerKey, issuerColor, issuerLabel }: { issuerKey: string; issuerColor: string; issuerLabel: string }) {
  const [imgError, setImgError] = useState(false)
  const logoUrl = Object.entries(ISSUER_LOGO).find(([k]) => issuerKey.includes(k))?.[1]

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="w-8 h-8 rounded-lg object-contain flex-shrink-0 bg-white"
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
      style={{ backgroundColor: issuerColor }}
    >
      {issuerLabel}
    </div>
  )
}

interface GalleryCard {
  readonly id: string
  readonly cardName: string
  readonly cardNetwork: string
  readonly mask: string | null
  readonly balance: number
  readonly creditLimit: number
  readonly annualFee: number
  readonly rewardType: string
  readonly pointsBalance?: number | null
  readonly cashbackBalance?: number | null
  readonly annualFeeDate?: string | null
  readonly nextPaymentDueDate?: string | null
  readonly cardImageUrl?: string | null
  readonly accountType?: string
}

interface IssuerGroupProps {
  issuerName: string
  cards: readonly GalleryCard[]
}

export function IssuerGroup({ issuerName, cards }: IssuerGroupProps) {
  const issuerKey = issuerName.toLowerCase()
  const issuerColor = Object.entries(ISSUER_COLORS).find(([k]) => issuerKey.includes(k))?.[1] ?? "#6366f1"
  const issuerLabel = Object.entries(ISSUER_SHORT).find(([k]) => issuerKey.includes(k))?.[1]
    ?? issuerName.charAt(0).toUpperCase()

  return (
    <section>
      {/* Card gallery grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {cards.map((card) => (
          <CardGalleryItem
            key={card.id}
            card={{ ...card, issuer: issuerName }}
            href={`/finance/cards/${card.id}`}
          />
        ))}
      </div>
    </section>
  )
}
