"use client"

import { useEffect, useRef, useState } from "react"
import { usePlaidLink } from "react-plaid-link"
import { toast } from "sonner"
import { useCreateReconnectToken, useCompleteReconnect } from "@/hooks/use-finance"
import { InstitutionLogo } from "@/components/finance/institution-logo"

interface ErrorInstitution {
  id: string
  institutionName: string
  institutionLogo: string | null
  provider: string
  status: string
  errorMessage: string | null
}

export function ReconnectBanner({ institutions }: { institutions: ErrorInstitution[] }) {
  const errored = institutions.filter((i) => i.status === "error" && i.provider !== "manual")
  if (errored.length === 0) return null

  return (
    <div id="reconnect-banner" className="bg-error/5 border border-error/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-rounded text-error" style={{ fontSize: 20 }}>error</span>
        <span className="text-sm font-semibold text-foreground">
          {errored.length === 1
            ? "1 account needs attention"
            : `${errored.length} accounts need attention`}
        </span>
      </div>
      <div className="space-y-2">
        {errored.map((inst) => (
          <ReconnectRow key={inst.id} institution={inst} />
        ))}
      </div>
    </div>
  )
}

function ReconnectRow({ institution }: { institution: ErrorInstitution }) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const createToken = useCreateReconnectToken()
  const completeReconnect = useCompleteReconnect()

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: () => {
      toast.info(`Reconnecting ${institution.institutionName}...`)
      completeReconnect.mutate(institution.id, {
        onSuccess: () => toast.success(`${institution.institutionName} reconnected successfully`),
        onError: (err) => toast.error(err.message),
      })
    },
    onExit: () => setLinkToken(null),
  })

  // Auto-open Plaid Link once token arrives after click
  const pendingOpen = useRef(false)
  useEffect(() => {
    if (pendingOpen.current && linkToken && ready) {
      pendingOpen.current = false
      open()
    }
  }, [linkToken, ready, open])

  const handleReconnect = () => {
    if (linkToken && ready) {
      open()
      return
    }
    pendingOpen.current = true
    createToken.mutate(institution.id, {
      onSuccess: (data) => setLinkToken(data.linkToken),
      onError: (err) => { pendingOpen.current = false; toast.error(err.message) },
    })
  }

  const isPending = createToken.isPending || completeReconnect.isPending

  return (
    <div className="flex items-center gap-3 pl-7">
      <InstitutionLogo src={institution.institutionLogo} size={6} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground">{institution.institutionName}</span>
        {institution.errorMessage && (
          <p className="text-xs text-error/70 truncate">{institution.errorMessage}</p>
        )}
      </div>
      <button
        onClick={handleReconnect}
        disabled={isPending}
        className="px-3 py-1.5 text-xs font-medium text-white bg-error hover:bg-error/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 14 }}>link</span>
        {isPending ? "Reconnecting..." : "Reconnect"}
      </button>
    </div>
  )
}
