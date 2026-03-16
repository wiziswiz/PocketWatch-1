import { getCurrentUser } from "@/lib/auth"
import { apiError } from "@/lib/api-error"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return apiError("F6070", "Authentication required", 401)

  try {
    // Fetch all card profiles with reward rates
    const cards = await db.creditCardProfile.findMany({
      where: { userId: user.id },
      include: { rewardRates: true },
    })

    if (cards.length === 0) {
      return NextResponse.json({
        walletStrategy: [],
        totalOptimalRewards: 0,
        totalActualRewards: 0,
        gapAmount: 0,
        pointsValuation: [],
      })
    }

    // Get current month spending by category (using most recent data month)
    const recentMonth = await db.$queryRaw<Array<{ month: string }>>`
      SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') AS month
      FROM "FinanceTransaction"
      WHERE "userId" = ${user.id} AND "isDuplicate" = false AND "isExcluded" = false
      ORDER BY month DESC LIMIT 1
    `

    const monthStr = recentMonth[0]?.month
    const categorySpending = new Map<string, number>()

    if (monthStr) {
      const startDate = new Date(`${monthStr}-01`)
      const parts = monthStr.split("-")
      const endDate = new Date(Number(parts[0]), Number(parts[1]), 1)

      const txGroups = await db.financeTransaction.groupBy({
        by: ["category"],
        where: {
          userId: user.id,
          isDuplicate: false,
          isExcluded: false,
          amount: { gt: 0 },
          date: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
      })

      for (const g of txGroups) {
        if (g.category) {
          categorySpending.set(g.category, g._sum.amount ?? 0)
        }
      }
    }

    // Default rate: the best base reward rate across all cards (what user gets without optimizing)
    const defaultRate = cards.reduce((best, c) => Math.max(best, c.baseRewardRate), 0)

    // Build wallet strategy: for each category, find the best card and compute gap
    const walletStrategy: Array<{
      category: string
      bestCard: string
      bestRate: number
      rewardUnit: "percent" | "x"
      monthlySpend: number
      monthlyReward: number
      actualReward: number
      gap: number
    }> = []

    for (const [category, monthlySpend] of categorySpending) {
      let bestCard = ""
      let bestRate = 0
      let bestRewardType = "cashback"

      for (const card of cards) {
        const explicitRate = card.rewardRates.find((r) => r.spendingCategory === category)
        const rate = explicitRate?.rewardRate ?? card.baseRewardRate

        if (rate > bestRate) {
          bestRate = rate
          bestCard = card.cardName
          bestRewardType = explicitRate?.rewardType ?? card.rewardType
        }
      }

      if (bestCard && monthlySpend > 0) {
        const optimalReward = round(monthlySpend * (bestRate / 100))
        const actualReward = round(monthlySpend * (defaultRate / 100))
        walletStrategy.push({
          category,
          bestCard,
          bestRate,
          rewardUnit: bestRewardType === "cashback" ? "percent" : "x",
          monthlySpend: round(monthlySpend),
          monthlyReward: optimalReward,
          actualReward,
          gap: round(optimalReward - actualReward),
        })
      }
    }

    walletStrategy.sort((a, b) => b.monthlyReward - a.monthlyReward)

    const totalOptimalRewards = walletStrategy.reduce((s, w) => s + w.monthlyReward, 0)
    const totalSpending = [...categorySpending.values()].reduce((s, v) => s + v, 0)
    const totalActualRewards = round(totalSpending * (defaultRate / 100))
    const gapAmount = round(totalOptimalRewards - totalActualRewards)

    // Points valuation per program
    // Use explicit balances if available, otherwise estimate from last month's spending
    const programMap = new Map<string, {
      balance: number
      valuePerPoint: number
      hasExplicitBalance: boolean
      estimatedMonthlyReward: number
      rewardType: string
      cardNames: string[]
      cardImageUrls: string[]
    }>()

    for (const card of cards) {
      const program = card.rewardProgram ?? card.cardName
      const explicitBalance = card.pointsBalance ?? card.cashbackBalance ?? 0
      const hasExplicit = (card.pointsBalance != null && card.pointsBalance > 0) ||
        (card.cashbackBalance != null && card.cashbackBalance > 0)
      const vpp = card.rewardType === "cashback" ? 100 : (card.pointValue ?? 1)

      // Estimate monthly reward earned on this card from category spending
      let monthlyReward = 0
      for (const [category, spend] of categorySpending) {
        const explicitRate = card.rewardRates.find((r) => r.spendingCategory === category)
        const rate = explicitRate?.rewardRate ?? card.baseRewardRate
        // For estimation, assume spending is split evenly across cards for now
        // A better heuristic: only attribute categories where this card is best
        const isBestForCategory = walletStrategy.find((w) => w.category === category && w.bestCard === card.cardName)
        if (isBestForCategory) {
          monthlyReward += spend * (rate / 100)
        }
      }

      const existing = programMap.get(program)
      if (existing) {
        if (hasExplicit) existing.balance += explicitBalance
        existing.estimatedMonthlyReward += monthlyReward
        existing.hasExplicitBalance = existing.hasExplicitBalance || hasExplicit
        if (!existing.cardNames.includes(card.cardName)) existing.cardNames.push(card.cardName)
        if (card.cardImageUrl && !existing.cardImageUrls.includes(card.cardImageUrl)) {
          existing.cardImageUrls.push(card.cardImageUrl)
        }
      } else {
        programMap.set(program, {
          balance: hasExplicit ? explicitBalance : 0,
          valuePerPoint: vpp,
          hasExplicitBalance: hasExplicit,
          estimatedMonthlyReward: round(monthlyReward),
          rewardType: card.rewardType,
          cardNames: [card.cardName],
          cardImageUrls: card.cardImageUrl ? [card.cardImageUrl] : [],
        })
      }
    }

    const pointsValuation = [...programMap.entries()].map(([program, data]) => ({
      program,
      balance: data.hasExplicitBalance ? data.balance : 0,
      valuePerPoint: data.valuePerPoint,
      totalValue: data.hasExplicitBalance
        ? round(data.balance * (data.valuePerPoint / 100))
        : 0,
      estimatedMonthlyReward: data.estimatedMonthlyReward,
      rewardType: data.rewardType,
      cardNames: data.cardNames,
      cardImageUrls: data.cardImageUrls,
    }))

    return NextResponse.json({
      walletStrategy,
      totalOptimalRewards: round(totalOptimalRewards),
      totalActualRewards,
      gapAmount,
      pointsValuation,
    })
  } catch (err) {
    return apiError("F6071", "Failed to compute card strategy", 500, err)
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
