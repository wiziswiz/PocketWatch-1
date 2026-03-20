"use client"

import { useState } from "react"
import { useTravelCredentials, useSaveTravelCredential, useDeleteTravelCredential } from "@/hooks/travel"
import { toast } from "sonner"
import { CredentialCard } from "./credential-card"

export function TravelSettingsForm() {
  const { data, isLoading } = useTravelCredentials()
  const saveMutation = useSaveTravelCredential()
  const deleteMutation = useDeleteTravelCredential()

  const [roameSession, setRoameSession] = useState("")
  const [serpApiKey, setSerpApiKey] = useState("")
  const [atfApiKey, setAtfApiKey] = useState("")
  const [refreshToken, setRefreshToken] = useState("")

  const roameCred = data?.services.find(s => s.service === "roame")
  const serpApiCred = data?.services.find(s => s.service === "serpapi")
  const atfCred = data?.services.find(s => s.service === "atf")
  const refreshCred = data?.services.find(s => s.service === "roame_refresh")

  const save = async (service: "roame" | "serpapi" | "atf" | "roame_refresh", key: string, label: string, reset: () => void) => {
    if (!key.trim()) return
    try {
      await saveMutation.mutateAsync({ service, key: key.trim() })
      reset()
      toast.success(`${label} saved`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleDelete = async (service: "roame" | "serpapi" | "atf" | "roame_refresh") => {
    try {
      await deleteMutation.mutateAsync(service)
      const names: Record<string, string> = { roame: "Roame", serpapi: "SerpAPI", atf: "ATF", roame_refresh: "Roame refresh token" }
      toast.success(`${names[service] || service} credential removed`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  if (isLoading) {
    return (
      <div className="card p-6 text-center">
        <span className="material-symbols-rounded animate-spin text-foreground-muted" style={{ fontSize: 24 }}>
          progress_activity
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <CredentialCard
        icon="key"
        title="Roame Session"
        credential={roameCred}
        description="Paste your Roame session JWT from browser DevTools (starts with eyJ...). Searches 19+ award programs."
        inputType="textarea"
        rows={3}
        inputValue={roameSession}
        onInputChange={setRoameSession}
        placeholder="Paste session JWT (eyJ...) or JSON with session field"
        onSave={() => save("roame", roameSession, "Roame session", () => setRoameSession(""))}
        onDelete={() => handleDelete("roame")}
        isSaving={saveMutation.isPending}
        isDeleting={deleteMutation.isPending}
        saveLabel="Save Session"
      />

      <CredentialCard
        icon="search"
        title="SerpAPI Key"
        credential={serpApiCred}
        description={
          <>
            Google Flights cash prices + hotel search via SerpAPI. 100 free searches/month.{" "}
            <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Get a key
            </a>
          </>
        }
        inputValue={serpApiKey}
        onInputChange={setSerpApiKey}
        placeholder="Enter SerpAPI key"
        onSave={() => save("serpapi", serpApiKey, "SerpAPI key", () => setSerpApiKey(""))}
        onDelete={() => handleDelete("serpapi")}
        isSaving={saveMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />

      <CredentialCard
        icon="flight"
        title="Award Travel Finder (ATF)"
        credential={atfCred}
        description={
          <>
            Searches 19+ airlines for award availability. 150 calls/month.{" "}
            <a href="https://awardtravelfinder.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Get a key
            </a>
          </>
        }
        inputValue={atfApiKey}
        onInputChange={setAtfApiKey}
        placeholder="Enter ATF API key"
        onSave={() => save("atf", atfApiKey, "ATF API key", () => setAtfApiKey(""))}
        onDelete={() => handleDelete("atf")}
        isSaving={saveMutation.isPending}
        isDeleting={deleteMutation.isPending}
      />

      <CredentialCard
        icon="autorenew"
        title="Roame Auto-Refresh"
        badge="Auto-refresh enabled"
        credential={refreshCred}
        description="Firebase refresh token for automatic session renewal. One-time setup from browser IndexedDB (Application > IndexedDB > firebaseLocalStorageDb > find refresh token value)."
        inputType="textarea"
        rows={2}
        inputValue={refreshToken}
        onInputChange={setRefreshToken}
        placeholder="Paste Firebase refresh token"
        onSave={() => save("roame_refresh", refreshToken, "Roame refresh token — sessions will auto-renew", () => setRefreshToken(""))}
        onDelete={() => handleDelete("roame_refresh")}
        isSaving={saveMutation.isPending}
        isDeleting={deleteMutation.isPending}
        saveLabel="Save Token"
      />
    </div>
  )
}
