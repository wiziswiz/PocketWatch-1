"use client"

import { useAIInsights, useGenerateAIInsights } from "@/hooks/use-finance"
import { formatCurrency, cn } from "@/lib/utils"

export function DashboardInsightsCard() {
  const { data: aiData } = useAIInsights()
  const generateInsights = useGenerateAIInsights()

  return (
    <div className="bg-card rounded-xl p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-primary" style={{ fontSize: 18 }}>auto_awesome</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-foreground-muted">AI Insights</span>
        </div>
        <button
          onClick={() => generateInsights.mutate({ force: true })}
          disabled={generateInsights.isPending}
          className="p-1 rounded text-foreground-muted hover:text-foreground transition-colors"
          aria-label="Refresh insights"
        >
          <span className={cn("material-symbols-rounded", generateInsights.isPending && "animate-spin")} style={{ fontSize: 14 }}>
            {generateInsights.isPending ? "progress_activity" : "refresh"}
          </span>
        </button>
      </div>

      {aiData?.insights ? (
        <div className="space-y-3">
          {/* Key Insight */}
          <div>
            <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">Key Insight</span>
            <p className="text-xs font-semibold text-foreground mt-1.5">{aiData.insights.keyInsight.title}</p>
            <p className="text-[11px] text-foreground-muted leading-relaxed mt-0.5 line-clamp-3">{aiData.insights.keyInsight.description}</p>
          </div>

          {/* Top savings opportunity */}
          {aiData.insights.savingsOpportunities.length > 0 && (
            <div className="pt-2 border-t border-card-border/30">
              <span className="text-[9px] font-bold bg-success/10 text-success px-1.5 py-0.5 rounded uppercase">Savings</span>
              <p className="text-xs font-semibold text-foreground mt-1.5">{aiData.insights.savingsOpportunities[0].area}</p>
              <p className="text-[11px] text-foreground-muted leading-relaxed mt-0.5 line-clamp-2">{aiData.insights.savingsOpportunities[0].description}</p>
              {aiData.insights.savingsOpportunities[0].estimatedSavings > 0 && (
                <p className="text-[11px] font-semibold text-success mt-1">
                  Est. savings: {formatCurrency(aiData.insights.savingsOpportunities[0].estimatedSavings)}
                </p>
              )}
            </div>
          )}

          {/* Top action item */}
          {aiData.insights.actionItems.length > 0 && (
            <div className="pt-2 border-t border-card-border/30">
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                aiData.insights.actionItems[0].priority === "high" ? "bg-error/10 text-error" :
                aiData.insights.actionItems[0].priority === "medium" ? "bg-warning/10 text-warning" :
                "bg-info/10 text-info"
              )}>
                {aiData.insights.actionItems[0].priority}
              </span>
              <p className="text-[11px] text-foreground leading-relaxed mt-1.5 line-clamp-2">{aiData.insights.actionItems[0].action}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <span className="material-symbols-rounded text-foreground-muted/30 block mb-2" style={{ fontSize: 24 }}>auto_awesome</span>
          <p className="text-[11px] text-foreground-muted mb-3">Get AI-powered spending insights</p>
          <button
            onClick={() => generateInsights.mutate({})}
            disabled={generateInsights.isPending}
            className="px-4 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {generateInsights.isPending ? "Generating..." : "Generate"}
          </button>
        </div>
      )}
    </div>
  )
}
