/**
 * AI prompt builder for financial analysis.
 * Builds a structured prompt from anonymized financial context.
 */

import type { AnonymizedFinancialContext } from "./anonymize"

export interface AIInsightsResponse {
  keyInsight: { title: string; description: string }
  savingsOpportunities: Array<{ area: string; estimatedSavings: number; description: string }>
  budgetRecommendations: Array<{ category: string; suggestedLimit: number; reason: string }>
  subscriptionReview: Array<{ name: string; verdict: "keep" | "review" | "cancel"; reason: string }>
  anomalyComments: Array<{ category: string; comment: string }>
  actionItems: Array<{ action: string; priority: "high" | "medium" | "low" }>
}

function buildRecurringSection(context: AnonymizedFinancialContext): string {
  const fmt = (s: { name: string; amount: number; frequency: string; category: string | null; isWanted: boolean }) =>
    `- ${s.name}: $${s.amount}/${s.frequency} [${s.category ?? "uncategorized"}]${s.isWanted ? "" : " (marked unwanted)"}`

  const groups = {
    subscription: context.subscriptions.filter((s) => s.billType === "subscription" || !s.billType),
    insurance: context.subscriptions.filter((s) => s.billType === "insurance"),
    cc_annual_fee: context.subscriptions.filter((s) => s.billType === "cc_annual_fee"),
    membership: context.subscriptions.filter((s) => s.billType === "membership"),
    bill: context.subscriptions.filter((s) => s.billType === "bill"),
  }

  return [
    groups.subscription.length > 0 ? `SUBSCRIPTIONS (${groups.subscription.length}):\n${groups.subscription.map(fmt).join("\n")}` : null,
    groups.insurance.length > 0 ? `INSURANCE (${groups.insurance.length}):\n${groups.insurance.map(fmt).join("\n")}` : null,
    groups.cc_annual_fee.length > 0 ? `CC ANNUAL FEES (${groups.cc_annual_fee.length}):\n${groups.cc_annual_fee.map(fmt).join("\n")}` : null,
    groups.membership.length > 0 ? `MEMBERSHIPS (${groups.membership.length}):\n${groups.membership.map(fmt).join("\n")}` : null,
    groups.bill.length > 0 ? `OTHER BILLS (${groups.bill.length}):\n${groups.bill.map(fmt).join("\n")}` : null,
  ].filter(Boolean).join("\n\n") || "No subscriptions detected."
}

export function buildFinancialAnalysisPrompt(context: AnonymizedFinancialContext): string {
  return `You are a personal finance advisor analyzing spending data for ${context.month}.
Respond ONLY with valid JSON matching the schema below. No markdown, no explanation, just JSON.

IMPORTANT RULES:
- The keyInsight must be a NON-OBVIOUS behavioral pattern or actionable recommendation. Do NOT restate spending totals, income, or savings rate — the user already sees those numbers. Instead identify: a hidden pattern (e.g. "Weekday lunches cost more than groceries"), a behavioral change to make (e.g. "Switching 3 Uber rides/week to subway saves $400/mo"), or a risk (e.g. "Credit utilization spiked — pay down before statement closes").
- savingsOpportunities must include specific merchant names, dollar amounts, and concrete actions.
- actionItems must be specific enough to act on TODAY, not vague advice like "reduce spending".

SCHEMA:
{
  "keyInsight": { "title": "string (max 60 chars, actionable not descriptive)", "description": "string (max 250 chars, specific behavioral insight)" },
  "savingsOpportunities": [{ "area": "string", "estimatedSavings": number, "description": "string (reference merchants and amounts)" }],
  "budgetRecommendations": [{ "category": "string", "suggestedLimit": number, "reason": "string" }],
  "subscriptionReview": [{ "name": "string", "verdict": "keep|review|cancel", "reason": "string" }],
  "anomalyComments": [{ "category": "string", "comment": "string" }],
  "actionItems": [{ "action": "string (max 120 chars, specific and actionable)", "priority": "high|medium|low" }]
}

FINANCIAL DATA:
- Income: $${context.totalIncome.toLocaleString()}
- Spending: $${context.totalSpending.toLocaleString()}
- Savings rate: ${context.savingsRate}%
- Health score: ${context.healthScore}/100 (${context.healthGrade})
- Daily avg spend: $${context.spendingVelocity.dailyAvg.toLocaleString()}
- Projected month-end: $${context.spendingVelocity.projectedTotal.toLocaleString()}
- MoM spending change: ${context.spendingVelocity.momChangePercent > 0 ? "+" : ""}${context.spendingVelocity.momChangePercent}%
- Days remaining: ${context.spendingVelocity.daysRemaining}
- Safe daily spend: $${context.cashFlow.safeDailySpend.toLocaleString()}

SPENDING BY CATEGORY:
${context.categoryBreakdown.slice(0, 10).map((c) => {
  const budget = c.budgetLimit != null ? ` (budget: $${c.budgetLimit}, ${c.budgetUsedPercent?.toFixed(0)}% used)` : ""
  const change = c.changePercent != null ? ` [${c.changePercent > 0 ? "+" : ""}${c.changePercent}% vs last month]` : " [new]"
  return `- ${c.category}: $${c.currentTotal}${budget}${change}`
}).join("\n")}

TOP MERCHANTS:
${context.topMerchants.map((m) => `- ${m.name}: $${m.total} (${m.count}x) [${m.category ?? "uncategorized"}]`).join("\n")}

${context.anomalies.length > 0 ? `ANOMALIES (2x+ vs last month):
${context.anomalies.map((a) => `- ${a.category}: $${a.currentAmount} vs $${a.previousAmount} (${a.multiplier}x)`).join("\n")}` : ""}

RECURRING CHARGES (${context.subscriptionSummary.activeCount} active, $${context.subscriptionSummary.monthlyTotal}/mo total, subscriptions only: $${context.subscriptionSummary.monthlySubsOnly}/mo):
${buildRecurringSection(context)}
${context.subscriptionSummary.unwantedCount > 0 ? `Unwanted subs potential savings: $${context.subscriptionSummary.potentialSavings}/mo` : ""}

COST STRUCTURE:
- Recurring: $${context.recurringVsOneTime.recurringTotal} (${context.recurringVsOneTime.fixedCostRatio}%)
- One-time: $${context.recurringVsOneTime.oneTimeTotal}

Give practical, specific advice. Reference actual merchant names and dollar amounts. The user can already see their totals — tell them something they DON'T know.`
}
