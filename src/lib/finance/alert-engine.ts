/**
 * Financial alert engine — sends Telegram notifications for budget, spending, and bill events.
 */

import { db } from "@/lib/db"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? ""
const LARGE_TRANSACTION_THRESHOLD = 500
const BUDGET_WARNING_THRESHOLD = 0.8
const UNUSUAL_SPEND_MULTIPLIER = 2
const BILL_REMINDER_DAYS = 3
const LOOKBACK_HOURS = 24

// ─── Telegram Transport ──────────────────────────────────────

async function sendTelegram(text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[Alert] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping alert")
    return
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "unknown")
    console.error(`[Alert] Telegram send failed: ${res.status} ${body}`)
  }
}

function fmtUSD(n: number): string {
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Alert Checks ────────────────────────────────────────────

async function checkBudgetAlerts(userId: string): Promise<string[]> {
  const budgets = await db.financeBudget.findMany({
    where: { userId, isActive: true },
    select: { category: true, monthlyLimit: true },
  })
  if (budgets.length === 0) return []

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const messages: string[] = []

  for (const budget of budgets) {
    const agg = await db.financeTransaction.aggregate({
      where: {
        userId,
        category: budget.category,
        isExcluded: false,
        isDuplicate: false,
        date: { gte: monthStart },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    })

    const spent = agg._sum.amount ?? 0
    const ratio = spent / budget.monthlyLimit

    if (ratio >= 1) {
      messages.push(
        `*Budget Exceeded* \n${budget.category}: *${fmtUSD(spent)}* / ${fmtUSD(budget.monthlyLimit)} (${Math.round(ratio * 100)}%)`
      )
    } else if (ratio >= BUDGET_WARNING_THRESHOLD) {
      messages.push(
        `*Budget Warning* \n${budget.category}: *${fmtUSD(spent)}* / ${fmtUSD(budget.monthlyLimit)} (${Math.round(ratio * 100)}%)`
      )
    }
  }

  return messages
}

async function checkUnusualSpend(userId: string): Promise<string[]> {
  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000)

  const recentTxns = await db.financeTransaction.findMany({
    where: {
      userId,
      isExcluded: false,
      isDuplicate: false,
      createdAt: { gte: cutoff },
      amount: { gt: 0 },
      category: { not: null },
    },
    select: { amount: true, category: true, name: true },
  })

  if (recentTxns.length === 0) return []

  // Get 3-month category averages
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const categories = [...new Set(recentTxns.map((t) => t.category).filter(Boolean))] as string[]
  const messages: string[] = []

  for (const cat of categories) {
    const agg = await db.financeTransaction.aggregate({
      where: {
        userId,
        category: cat,
        isExcluded: false,
        isDuplicate: false,
        date: { gte: threeMonthsAgo },
        amount: { gt: 0 },
      },
      _sum: { amount: true },
      _count: true,
    })

    const totalSpent = agg._sum.amount ?? 0
    const avgPerTxn = agg._count > 0 ? totalSpent / agg._count : 0
    if (avgPerTxn === 0) continue

    const unusual = recentTxns.filter(
      (t) => t.category === cat && t.amount > avgPerTxn * UNUSUAL_SPEND_MULTIPLIER
    )

    for (const txn of unusual) {
      messages.push(
        `*Unusual Spend* \n*${fmtUSD(txn.amount)}* at ${txn.name}\n${cat} avg: ${fmtUSD(avgPerTxn)} per transaction`
      )
    }
  }

  return messages
}

async function checkBillReminders(userId: string): Promise<string[]> {
  const now = new Date()
  const reminderCutoff = new Date(now.getTime() + BILL_REMINDER_DAYS * 24 * 60 * 60 * 1000)

  const bills = await db.financeSubscription.findMany({
    where: {
      userId,
      status: "active",
      nextChargeDate: { gte: now, lte: reminderCutoff },
    },
    select: { merchantName: true, amount: true, nextChargeDate: true, nickname: true },
  })

  return bills.map((bill) => {
    const name = bill.nickname ?? bill.merchantName
    const dueDate = bill.nextChargeDate!.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    return `*Bill Due Soon* \n${name}: *${fmtUSD(bill.amount)}* on ${dueDate}`
  })
}

async function checkLargeTransactions(userId: string): Promise<string[]> {
  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000)

  const large = await db.financeTransaction.findMany({
    where: {
      userId,
      isExcluded: false,
      isDuplicate: false,
      createdAt: { gte: cutoff },
      amount: { gt: LARGE_TRANSACTION_THRESHOLD },
    },
    select: { name: true, amount: true, merchantName: true, category: true },
    take: 10,
  })

  return large.map((txn) => {
    const merchant = txn.merchantName ?? txn.name
    const cat = txn.category ? ` (${txn.category})` : ""
    return `*Large Transaction* \n*${fmtUSD(txn.amount)}* at ${merchant}${cat}`
  })
}

// ─── Main Entry Point ────────────────────────────────────────

export async function checkAndSendAlerts(userId: string): Promise<void> {
  const [budgetAlerts, unusualAlerts, billAlerts, largeAlerts] = await Promise.all([
    checkBudgetAlerts(userId),
    checkUnusualSpend(userId),
    checkBillReminders(userId),
    checkLargeTransactions(userId),
  ])

  const allAlerts = [...budgetAlerts, ...unusualAlerts, ...billAlerts, ...largeAlerts]
  if (allAlerts.length === 0) return

  const header = `*PocketWatch Alerts* (${allAlerts.length})\n`
  const body = allAlerts.join("\n\n")
  await sendTelegram(`${header}\n${body}`)
}
