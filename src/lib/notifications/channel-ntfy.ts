/**
 * ntfy.sh push notification channel.
 * Free, open-source push notifications for iOS/Android/desktop.
 * Sends via simple HTTP POST to a topic URL.
 */

import { db } from "@/lib/db"
import { decryptCredential } from "@/lib/finance/crypto"
import type { NotificationPayload } from "./dispatcher"

export async function sendNtfy(userId: string, payload: NotificationPayload): Promise<boolean> {
  const key = await db.externalApiKey.findFirst({
    where: { userId, serviceName: "notify_ntfy" },
    select: { apiKeyEnc: true },
  })
  if (!key) return false

  let config: { serverUrl: string; topic: string; token?: string }
  try {
    const decrypted = await decryptCredential(key.apiKeyEnc)
    config = JSON.parse(decrypted)
  } catch {
    console.error("[notify:ntfy] Failed to decrypt config")
    return false
  }

  if (!config.topic) return false

  const baseUrl = config.serverUrl || "https://ntfy.sh"
  const url = `${baseUrl.replace(/\/+$/, "")}/${config.topic}`

  try {
    const headers: Record<string, string> = {
      Title: payload.title,
      Tags: payload.tag ?? "moneybag",
    }

    if (payload.url) headers.Click = payload.url
    if (config.token) headers.Authorization = `Bearer ${config.token}`

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: payload.body,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "unknown")
      console.error(`[notify:ntfy] Send failed: ${res.status} ${body}`)
      return false
    }

    return true
  } catch (err) {
    console.error("[notify:ntfy] Error:", err instanceof Error ? err.message : err)
    return false
  }
}
