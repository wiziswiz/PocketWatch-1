export type PerkType = "limited" | "unlimited"
export type PerkPeriod = "monthly" | "quarterly" | "annual" | "one_time"

export interface CardPerkFull {
  id: string
  cardProfileId: string
  name: string
  value: number
  maxValue: number
  usedValue: number
  perkType: PerkType
  period: PerkPeriod
  periodResetDay: number
  currentPeriodStart: string | null
  description: string | null
  isUsed: boolean
  usedDate: string | null
  // Computed by the API
  percentUsed: number
  daysRemaining: number | null
  periodEnd: string | null
  periodLabel: string
  annualizedValue: number
}

export interface PerkUsageLogEntry {
  id: string
  perkId: string
  amount: number
  note: string | null
  loggedAt: string
  transactionId: string | null
}

export interface CardPerksGroup {
  cardId: string
  cardName: string
  annualFee: number
  cardImageUrl: string | null
  issuer?: string
  perks: CardPerkFull[]
}
