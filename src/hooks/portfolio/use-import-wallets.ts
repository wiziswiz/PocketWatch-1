"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { portfolioFetch, portfolioKeys } from "./shared"
import { toast } from "sonner"

interface ImportWallet {
  name?: string
  address?: string
  chain?: string
}

interface ImportResult {
  imported: number
  skipped: { name: string; reason: string }[]
  total: number
}

export function useImportWallets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (wallets: ImportWallet[]) =>
      portfolioFetch<ImportResult>("/accounts/import", {
        method: "POST",
        body: JSON.stringify({ wallets }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: portfolioKeys.accounts() })
      qc.invalidateQueries({ queryKey: portfolioKeys.balances() })
      qc.invalidateQueries({ queryKey: portfolioKeys.overview() })
      qc.invalidateQueries({ queryKey: portfolioKeys.syncProgress() })

      const msg = `Imported ${data.imported} wallet${data.imported !== 1 ? "s" : ""}`
      if (data.skipped.length > 0) {
        toast.success(`${msg} (${data.skipped.length} skipped)`)
      } else {
        toast.success(msg)
      }
    },
    onError: (err) => {
      toast.error(err.message || "Import failed")
    },
  })
}
