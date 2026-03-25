"use client"

import { useState, useCallback } from "react"
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
  const [pointmeToken, setPointmeToken] = useState("")

  const POINTME_SCRIPT = `copy(JSON.stringify(await(await fetch('/api/auth/session')).json()))`

  const handleCopyScript = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(POINTME_SCRIPT)
      toast.success("Script copied — paste it in the point.me browser console")
    } catch {
      toast.error("Failed to copy — manually copy the script shown above")
    }
  }, [POINTME_SCRIPT])

  const roameCred = data?.services.find(s => s.service === "roame")
  const serpApiCred = data?.services.find(s => s.service === "serpapi")
  const atfCred = data?.services.find(s => s.service === "atf")
  const refreshCred = data?.services.find(s => s.service === "roame_refresh")
  const pointmeCred = data?.services.find(s => s.service === "pointme")

  const save = async (service: "roame" | "serpapi" | "atf" | "roame_refresh" | "pointme", key: string, label: string, reset: () => void) => {
    if (!key.trim()) return
    try {
      await saveMutation.mutateAsync({ service, key: key.trim() })
      reset()
      toast.success(`${label} saved`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handlePasteConnect = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        toast.error("Clipboard is empty — click the bookmarklet on point.me first")
        return
      }
      await saveMutation.mutateAsync({ service: "pointme", key: text.trim() })
      toast.success("point.me connected — token will auto-refresh")
    } catch (err) {
      const msg = (err as Error).message
      if (msg.includes("clipboard") || msg.includes("permission")) {
        toast.error("Clipboard access denied — paste manually instead")
      } else {
        toast.error(msg)
      }
    }
  }

  const handleDelete = async (service: "roame" | "serpapi" | "atf" | "roame_refresh" | "pointme") => {
    try {
      await deleteMutation.mutateAsync(service)
      const names: Record<string, string> = { roame: "Roame", serpapi: "SerpAPI", atf: "ATF", roame_refresh: "Roame refresh token", pointme: "point.me" }
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
        description={
          <>
            Searches 19+ award programs in one API call.{" "}
            <a href="https://roame.travel" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Sign up free</a>
            {" → "}login → open DevTools (F12) → Application → Cookies → find <code className="text-[10px] bg-card-border/50 px-1 rounded">session</code> cookie (starts with eyJ...).
          </>
        }
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
            Searches 22 airlines for award availability (150 calls/month).{" "}
            <a href="https://awardtravelfinder.com/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Get API key
            </a>
            {" "}— sign up, go to API settings, and copy your key.
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
        icon="travel_explore"
        title="point.me"
        badge={pointmeCred ? "Auto-refresh enabled" : undefined}
        credential={pointmeCred}
        description={
          <>
            Searches all major airline programs with real-time availability.{" "}
            <a href="https://point.me" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Login to point.me</a>
            {" → "}open Console (F12) → click{" "}
            <button
              type="button"
              onClick={handleCopyScript}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full border border-primary/30 hover:bg-primary/30 transition-colors cursor-pointer"
            >
              <span className="material-symbols-rounded" style={{ fontSize: 12 }}>content_copy</span>
              Copy Script
            </button>
            {" → paste in console → Enter → come back → "}
            <strong>Paste & Connect</strong>. Token auto-refreshes.
          </>
        }
        inputType="textarea"
        rows={3}
        inputValue={pointmeToken}
        onInputChange={setPointmeToken}
        placeholder='Paste session JSON or raw JWT — or use "Paste & Connect" after clicking the bookmarklet'
        onSave={() => save("pointme", pointmeToken, "point.me connected — token will auto-refresh", () => setPointmeToken(""))}
        onDelete={() => handleDelete("pointme")}
        isSaving={saveMutation.isPending}
        isDeleting={deleteMutation.isPending}
        saveLabel="Save Session"
        secondaryAction={{ label: "Paste & Connect", onClick: handlePasteConnect }}
      />

      <CredentialCard
        icon="autorenew"
        title="Roame Auto-Refresh"
        badge="Auto-refresh enabled"
        credential={refreshCred}
        description={
          <>
            One-time setup for automatic session renewal.{" "}
            <a href="https://roame.travel" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Login to Roame</a>
            {" → "}DevTools (F12) → Application → IndexedDB → <code className="text-[10px] bg-card-border/50 px-1 rounded">firebaseLocalStorageDb</code> → copy the <code className="text-[10px] bg-card-border/50 px-1 rounded">refreshToken</code> value.
          </>
        }
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
