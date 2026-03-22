"use client"

import { useState, useMemo } from "react"
import { useImportWallets } from "@/hooks/portfolio/use-import-wallets"
import { isEvmAddress, isSolanaAddress } from "@/lib/tracker/chains"

interface ParsedWallet {
  name: string
  address: string
  chain: string
  status: "ready" | "skipped"
  reason?: string
  selected: boolean
}

const UNSUPPORTED_CHAINS = new Set([
  "aptos", "cosmos", "osmo", "osmosis", "sui", "starknet",
  "xrp", "ripple", "cardano", "ada", "injective", "inj",
  "thorchain", "thor", "maya", "mayachain", "bnb beacon",
  "terra", "luna",
])

function detectChain(address: string): string {
  if (isEvmAddress(address)) return "EVM"
  if (isSolanaAddress(address)) return "Solana"
  if (/^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90})$/.test(address)) return "BTC"
  return "unknown"
}

function parseInput(text: string): ParsedWallet[] {
  const lines = text.trim().split("\n").filter((l) => l.trim())
  const results: ParsedWallet[] = []

  for (const line of lines) {
    // Try tab-separated first (Google Sheets paste), then comma
    const parts = line.includes("\t") ? line.split("\t") : line.split(",")
    const name = (parts[0] ?? "").trim()
    const address = (parts[1] ?? "").trim()
    const chain = (parts[2] ?? "").trim()

    if (!address) {
      if (name) results.push({ name, address: "", chain: "", status: "skipped", reason: "No address", selected: false })
      continue
    }

    const normalizedChain = chain.toLowerCase()
    if (UNSUPPORTED_CHAINS.has(normalizedChain)) {
      results.push({ name, address, chain, status: "skipped", reason: `Unsupported: ${chain}`, selected: false })
      continue
    }

    const detectedChain = chain || detectChain(address)
    if (detectedChain === "unknown") {
      results.push({ name, address, chain: "?", status: "skipped", reason: "Unknown chain", selected: false })
      continue
    }

    results.push({ name, address, chain: detectedChain, status: "ready", selected: true })
  }

  return results
}

interface ImportWalletsDialogProps {
  onClose: () => void
}

export function ImportWalletsDialog({ onClose }: ImportWalletsDialogProps) {
  const [rawInput, setRawInput] = useState("")
  const [parsed, setParsed] = useState<ParsedWallet[] | null>(null)
  const importMutation = useImportWallets()

  const wallets = parsed ?? []
  const readyWallets = useMemo(() => wallets.filter((w) => w.status === "ready" && w.selected), [wallets])
  const skippedWallets = useMemo(() => wallets.filter((w) => w.status === "skipped"), [wallets])

  const handleParse = () => {
    setParsed(parseInput(rawInput))
  }

  const handleToggle = (index: number) => {
    setParsed((prev) =>
      prev?.map((w, i) => (i === index && w.status === "ready" ? { ...w, selected: !w.selected } : w)) ?? null
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setParsed((prev) => prev?.map((w) => (w.status === "ready" ? { ...w, selected } : w)) ?? null)
  }

  const handleImport = () => {
    const toImport = readyWallets.map((w) => ({ name: w.name, address: w.address, chain: w.chain }))
    importMutation.mutate(toImport, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border w-full max-w-2xl rounded-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-card-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Import Wallets</h2>
            <p className="text-xs text-foreground-muted mt-0.5">Paste wallet data (Name, Address, Chain) — tab or comma separated</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-background-secondary">
            <span className="material-symbols-rounded text-foreground-muted" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Input phase */}
          {!parsed && (
            <>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={"Main Wallet\t0x1234...abcd\tEVM\nSolana Hot\tABC...xyz\tSolana\nBTC Cold\tbc1q...abc\tBTC"}
                className="w-full h-40 bg-background-secondary border border-card-border rounded-lg p-3 text-sm text-foreground font-data placeholder:text-foreground-muted/50 resize-none focus:outline-none focus:border-primary"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-foreground-muted">
                  {rawInput.trim().split("\n").filter(Boolean).length} line{rawInput.trim().split("\n").filter(Boolean).length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={handleParse}
                  disabled={!rawInput.trim()}
                  className="px-4 py-2 btn-primary text-sm font-semibold disabled:opacity-50"
                >
                  Preview Import
                </button>
              </div>
            </>
          )}

          {/* Preview phase */}
          {parsed && (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground">
                  <span className="font-semibold text-success">{readyWallets.length}</span> ready
                  {skippedWallets.length > 0 && (
                    <>, <span className="font-semibold text-foreground-muted">{skippedWallets.length}</span> skipped</>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSelectAll(true)} className="text-xs text-primary hover:underline">Select all</button>
                  <span className="text-foreground-muted text-xs">/</span>
                  <button onClick={() => handleSelectAll(false)} className="text-xs text-primary hover:underline">None</button>
                  <button onClick={() => setParsed(null)} className="text-xs text-foreground-muted hover:text-foreground ml-2">Edit</button>
                </div>
              </div>

              {/* Table */}
              <div className="border border-card-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card-elevated border-b border-card-border">
                      <th className="px-3 py-2 text-left text-xs font-medium text-foreground-muted w-8"></th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-foreground-muted">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-foreground-muted">Address</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-foreground-muted">Chain</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-foreground-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.map((w, i) => (
                      <tr key={i} className="border-b border-card-border last:border-b-0 hover:bg-primary-subtle">
                        <td className="px-3 py-1.5">
                          {w.status === "ready" ? (
                            <input
                              type="checkbox"
                              checked={w.selected}
                              onChange={() => handleToggle(i)}
                              className="accent-primary"
                            />
                          ) : (
                            <span className="text-foreground-muted/40">--</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-foreground font-data truncate max-w-[140px]">{w.name || "--"}</td>
                        <td className="px-3 py-1.5 font-data text-xs text-foreground-muted truncate max-w-[180px]" title={w.address}>
                          {w.address ? `${w.address.slice(0, 6)}...${w.address.slice(-4)}` : "--"}
                        </td>
                        <td className="px-3 py-1.5 text-foreground-muted text-xs">{w.chain}</td>
                        <td className="px-3 py-1.5">
                          {w.status === "ready" ? (
                            <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">READY</span>
                          ) : (
                            <span className="text-[10px] font-semibold text-foreground-muted bg-foreground-muted/10 px-1.5 py-0.5 rounded" title={w.reason}>
                              {w.reason ?? "SKIP"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import result */}
              {importMutation.data && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-sm text-success">
                  Imported {importMutation.data.imported} wallet{importMutation.data.imported !== 1 ? "s" : ""}
                  {importMutation.data.skipped.length > 0 && ` (${importMutation.data.skipped.length} skipped by server)`}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {parsed && (
          <div className="p-5 border-t border-card-border flex items-center justify-between">
            <p className="text-xs text-foreground-muted">
              {readyWallets.length} wallet{readyWallets.length !== 1 ? "s" : ""} selected for import
            </p>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 border border-card-border text-foreground-muted hover:text-foreground text-sm rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={readyWallets.length === 0 || importMutation.isPending}
                className="px-4 py-2 btn-primary text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {importMutation.isPending && (
                  <span className="material-symbols-rounded text-sm animate-spin">progress_activity</span>
                )}
                Import {readyWallets.length} Wallet{readyWallets.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
