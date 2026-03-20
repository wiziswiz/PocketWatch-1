"use client"

import { TravelSettingsForm } from "@/components/travel/travel-settings-form"

export default function TravelSettingsPage() {
  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Travel Settings</h1>
        <p className="text-sm text-foreground-muted mt-1">
          Configure search credentials for flight award search.
        </p>
      </div>
      <TravelSettingsForm />
    </div>
  )
}
