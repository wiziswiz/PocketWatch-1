"use client"

import { useState } from "react"
import { useOnboardingStatus } from "@/hooks/use-portfolio-tracker"
import PortfolioSetupWizard from "@/components/portfolio/portfolio-setup-wizard"
import { PortfolioDashboard } from "@/components/portfolio/portfolio-dashboard"
import { SetupRequiredState } from "@/components/portfolio/setup-required-state"

export default function PortfolioPage() {
  const {
    isComplete,
    hasSharedKey,
    isLoading: onboardingLoading,
    isError,
    suggestedStep,
  } = useOnboardingStatus()
  const [wizardCompleted, setWizardCompleted] = useState(false)

  // Show dashboard immediately if onboarding is complete or was completed this session.
  if (isComplete || wizardCompleted) {
    return <PortfolioDashboard />
  }

  // Only show loading skeleton while onboarding check runs for the first time
  if (onboardingLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-shimmer rounded-lg" />
        <div className="h-80 animate-shimmer rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-shimmer rounded-xl"
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-10">
        <SetupRequiredState service="zerion" feature="your portfolio overview" />
      </div>
    )
  }

  return (
    <PortfolioSetupWizard
      initialStep={suggestedStep}
      hasSharedKey={hasSharedKey}
      onComplete={() => setWizardCompleted(true)}
    />
  )
}
