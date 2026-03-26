"use client"

import { useState, useCallback } from "react"
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser"

export function usePasskey() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supported = typeof window !== "undefined" && browserSupportsWebAuthn()

  const authenticate = useCallback(async (): Promise<boolean> => {
    setError(null)
    setLoading(true)
    try {
      // 1. Get authentication options from server
      const optionsRes = await fetch("/api/auth/passkey/authenticate-options", {
        method: "POST",
      })
      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => null)
        setError(data?.error ?? `Server error (${optionsRes.status})`)
        return false
      }
      const options = await optionsRes.json()

      // 2. Prompt user for passkey (browser native UI)
      const credential = await startAuthentication({ optionsJSON: options })

      // 3. Send credential to server for verification
      const verifyRes = await fetch("/api/auth/passkey/authenticate-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      })
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => null)
        setError(data?.error ?? "Passkey authentication failed")
        return false
      }

      return true
    } catch (err) {
      // User cancelled or browser error
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError(null) // User cancelled — not an error
        return false
      }
      setError(err instanceof Error ? err.message : "Passkey authentication failed")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (name?: string): Promise<boolean> => {
    setError(null)
    setLoading(true)
    try {
      // 1. Get registration options from server
      const optionsRes = await fetch("/api/auth/passkey/register-options", {
        method: "POST",
      })
      if (!optionsRes.ok) {
        const data = await optionsRes.json().catch(() => null)
        setError(data?.error ?? `Server error (${optionsRes.status})`)
        return false
      }
      const options = await optionsRes.json()

      // 2. Prompt user to create passkey (browser native UI)
      const credential = await startRegistration({ optionsJSON: options })

      // 3. Send credential to server for verification + storage
      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credential, name }),
      })
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => null)
        setError(data?.error ?? "Passkey registration failed")
        return false
      }

      return true
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError(null)
        return false
      }
      setError(err instanceof Error ? err.message : "Passkey registration failed")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { supported, loading, error, authenticate, register, setError }
}
