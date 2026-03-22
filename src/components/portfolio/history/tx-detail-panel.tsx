"use client"

import { useState } from "react"
import { cn, formatCurrency } from "@/lib/utils"
import { getChainMeta, getChainColor } from "@/lib/portfolio/chains"
import { formatCryptoAmount, shortenAddress } from "@/lib/portfolio/utils"
import { EventBadge, getExplorerUrl, formatTimestamp } from "./history-helpers"
import { OUTGOING_TYPES } from "./history-constants"

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw history event shape
type HistoryEvent = Record<string, any>

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-card-border/30">
      <p className="text-[10px] font-medium uppercase tracking-widest text-foreground-muted mb-2">{title}</p>
      {children}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button onClick={handleCopy} className="p-0.5 rounded hover:bg-background-secondary transition-colors" title="Copy">
      <span className="material-symbols-rounded text-foreground-muted" style={{ fontSize: 14 }}>
        {copied ? "check" : "content_copy"}
      </span>
    </button>
  )
}

function AddressRow({ label, address, chain, walletLabel }: {
  label: string; address: string; chain?: string; walletLabel?: string
}) {
  const explorerUrl = address && chain ? getExplorerUrl(chain, `address/${address}`) : null
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] text-foreground-muted uppercase mb-0.5">{label}</p>
        {walletLabel && <p className="text-sm font-medium text-info">{walletLabel}</p>}
        <p className="text-xs font-data text-foreground-muted break-all">{shortenAddress(address, 8)}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 mt-1">
        <CopyButton text={address} />
        {explorerUrl && (
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded hover:bg-background-secondary">
            <span className="material-symbols-rounded text-foreground-muted" style={{ fontSize: 14 }}>open_in_new</span>
          </a>
        )}
      </div>
    </div>
  )
}

interface Props {
  transaction: HistoryEvent | null
  onClose: () => void
  /** Map of lowercase address → label from tracked wallets */
  walletLabels?: Map<string, string>
}

export function TxDetailPanel({ transaction, onClose, walletLabels }: Props) {
  if (!transaction) return null

  const tx = transaction
  const chain = tx.chain as string | undefined
  const chainMeta = chain ? getChainMeta(chain) : undefined
  const chainColor = chain ? getChainColor(chain) : undefined
  const eventType = (tx.event_type ?? tx.type ?? "unknown").toLowerCase()
  const direction = typeof tx.direction === "string" ? tx.direction.toLowerCase() : null
  const isOutgoing = direction === "out" || (!direction && OUTGOING_TYPES.has(eventType))
  const amount = tx.balance?.amount ?? tx.amount ?? 0
  const usdValue = tx.balance?.usd_value ?? tx.usd_value ?? null
  const symbol = tx.asset ?? tx.symbol ?? ""
  const txHash = tx.tx_hash as string | undefined
  const from = (direction === "out" ? tx.address : tx.counterparty) as string | undefined
  const to = (direction === "out" ? tx.counterparty : tx.address) as string | undefined
  const contractAddress = tx.contract_address ?? tx.asset_address
  const blockNumber = tx.block_number ?? tx.blockNumber
  const classification = tx.txClassification ?? tx.classification
  const dexName = tx.dexName

  const explorerTxUrl = txHash && chain ? getExplorerUrl(chain, `tx/${txHash}`) : null
  const explorerTokenUrl = contractAddress && chain && contractAddress !== "native"
    ? getExplorerUrl(chain, `token/${contractAddress}`)
    : null

  const getWalletLabel = (addr: string | undefined) => {
    if (!addr || !walletLabels) return undefined
    return walletLabels.get(addr.toLowerCase())
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-card border-l border-card-border z-50 overflow-y-auto">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {chainMeta && (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: chainColor ? `${chainColor}20` : undefined }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 20, color: chainColor }}>
                    {chainMeta.icon}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-foreground">{chainMeta?.name ?? chain ?? "Unknown"}</p>
                  <EventBadge type={eventType} />
                </div>
                <p className="text-xs text-foreground-muted">
                  {tx.timestamp ? formatTimestamp(tx.timestamp) : "--"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-background-secondary">
              <span className="material-symbols-rounded text-foreground-muted" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          {/* Amount */}
          <div className="mb-4">
            <p className={cn("font-data text-2xl font-bold tabular-nums", isOutgoing ? "text-error" : "text-success")}>
              {isOutgoing ? "-" : "+"}{formatCryptoAmount(amount, 6)} {symbol}
            </p>
            {usdValue != null && (
              <p className="text-sm text-foreground-muted font-data tabular-nums mt-0.5">
                {formatCurrency(Math.abs(usdValue))}
              </p>
            )}
          </div>

          {/* Transaction Hash */}
          {txHash && (
            <Section title="Transaction">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-data text-foreground-muted break-all">{shortenAddress(txHash, 10)}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <CopyButton text={txHash} />
                    {explorerTxUrl && (
                      <a href={explorerTxUrl} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded hover:bg-background-secondary">
                        <span className="material-symbols-rounded text-foreground-muted" style={{ fontSize: 14 }}>open_in_new</span>
                      </a>
                    )}
                  </div>
                </div>
                {blockNumber != null && (
                  <p className="text-xs text-foreground-muted">Block: <span className="font-data">{blockNumber.toLocaleString()}</span></p>
                )}
              </div>
            </Section>
          )}

          {/* From / To */}
          {(from || to) && (
            <Section title="From / To">
              <div className="space-y-2.5">
                {from && <AddressRow label="From" address={from} chain={chain} walletLabel={getWalletLabel(from)} />}
                {from && to && (
                  <div className="flex justify-center">
                    <span className="material-symbols-rounded text-foreground-muted" style={{ fontSize: 16 }}>arrow_downward</span>
                  </div>
                )}
                {to && <AddressRow label="To" address={to} chain={chain} walletLabel={getWalletLabel(to)} />}
              </div>
            </Section>
          )}

          {/* Token */}
          {symbol && (
            <Section title="Token">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{symbol}</p>
                {contractAddress && contractAddress !== "native" && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-data text-foreground-muted">{shortenAddress(contractAddress, 6)}</span>
                    <CopyButton text={contractAddress} />
                    {explorerTokenUrl && (
                      <a href={explorerTokenUrl} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded hover:bg-background-secondary">
                        <span className="material-symbols-rounded text-foreground-muted" style={{ fontSize: 14 }}>open_in_new</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Classification */}
          {(classification || dexName) && (
            <Section title="Classification">
              <div className="flex items-center gap-2">
                {classification && <EventBadge type={classification} />}
                {dexName && <span className="text-xs text-foreground-muted">via {dexName}</span>}
              </div>
            </Section>
          )}

          {/* Explorer Links */}
          <div className="pt-4 space-y-2">
            {explorerTxUrl && (
              <a
                href={explorerTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>open_in_new</span>
                View Transaction on {chainMeta?.name ?? "Explorer"}
              </a>
            )}
            {from && chain && (
              <a
                href={getExplorerUrl(chain, `address/${from}`) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>person</span>
                View Sender
              </a>
            )}
            {to && chain && (
              <a
                href={getExplorerUrl(chain, `address/${to}`) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>person</span>
                View Receiver
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
