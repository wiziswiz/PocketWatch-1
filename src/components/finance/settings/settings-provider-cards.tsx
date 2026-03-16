import { type ReactNode, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { SimpleFINConnect } from "@/components/finance/simplefin-connect"
import { PlaidLinkButton } from "@/components/finance/plaid-link-button"

interface Account {
  id: string
  name: string
  type: string
  mask: string | null
}

interface Institution {
  id: string
  provider: string
  institutionName: string
  accounts?: Account[]
  [key: string]: any
}

export function SettingsProviderCards({
  isPlaidConfigured,
  plaidInstitutions,
  simplefinInstitutions,
  manualInstitutions = [],
  connectSF,
  exchangeToken,
  onDisconnect,
  onDisconnectAllPlaid,
  onDisconnectAllSimplefin,
  onSyncSimplefin,
  isSyncingSimplefin,
  onRemoveAccount,
  plaidKeyForm,
}: {
  isPlaidConfigured: boolean
  plaidInstitutions: Institution[]
  simplefinInstitutions: Institution[]
  manualInstitutions?: Institution[]
  connectSF: { mutateAsync: (token: string) => Promise<{ institutionName: string }>; isPending: boolean }
  exchangeToken: { mutate: (args: any, opts?: any) => void; isPending: boolean }
  onDisconnect?: (id: string, name: string) => void
  onDisconnectAllPlaid?: () => void
  onDisconnectAllSimplefin?: () => void
  onSyncSimplefin?: () => void
  isSyncingSimplefin?: boolean
  onRemoveAccount?: (accountId: string, accountName: string) => void
  plaidKeyForm?: ReactNode
}) {
  const [showPlaidForm, setShowPlaidForm] = useState(false)
  const [connectingBank, setConnectingBank] = useState<string | null>(null)
  const plaidConnected = isPlaidConfigured || plaidInstitutions.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Plaid */}
      <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Plaid</p>
            <p className="text-xs text-foreground-muted mt-0.5">
              API-based bank linking with Plaid Link
            </p>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
            plaidConnected ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}>
            {plaidConnected ? "Connected" : "Not configured"}
          </span>
        </div>

        {/* Connected institutions + accounts */}
        {plaidInstitutions.length > 0 && (
          <div className="space-y-2 border-t border-card-border/40 pt-3">
            {plaidInstitutions.map((inst) => (
              <div key={inst.id} className="group/inst">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">{inst.institutionName}</p>
                  {onDisconnect && (
                    <button
                      onClick={() => onDisconnect(inst.id, inst.institutionName)}
                      className="text-[10px] text-foreground-muted/40 hover:text-error transition-colors shrink-0 opacity-0 group-hover/inst:opacity-100"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {inst.accounts && inst.accounts.length > 0 && (
                  <div className="ml-3 mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {inst.accounts.map((acct) => (
                      <div key={acct.id} className="flex items-center justify-between gap-2 py-0.5 group">
                        <span className="text-[11px] text-foreground-muted truncate">
                          {acct.name}
                          {acct.mask && <span className="text-foreground-muted/50 ml-1">****{acct.mask}</span>}
                          <span className="text-foreground-muted/40 ml-1 capitalize">{acct.type}</span>
                        </span>
                        {onRemoveAccount && (
                          <button
                            onClick={() => onRemoveAccount(acct.id, acct.name)}
                            className="text-[10px] text-foreground-muted/40 hover:text-error transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Connecting indicator */}
        {exchangeToken.isPending && connectingBank && (
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
            <span className="material-symbols-rounded text-primary animate-spin text-base">sync</span>
            <span className="text-xs font-medium text-foreground">Connecting {connectingBank}...</span>
          </div>
        )}

        {plaidConnected ? (
          <div className="flex items-center gap-3">
            <PlaidLinkButton
              onSuccess={(publicToken, metadata) => {
                setConnectingBank(metadata.institution.name)
                exchangeToken.mutate(
                  { publicToken, institutionId: metadata.institution.institution_id },
                  {
                    onSuccess: (result: { institutionName: string }) => { setConnectingBank(null); toast.success(`Connected ${result.institutionName}`) },
                    onError: (err: Error) => { setConnectingBank(null); toast.error(err.message) },
                  },
                )
              }}
              onError={(message) => toast.error(message)}
              className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
              buttonLabel="Connect via Plaid"
            />
            {onDisconnectAllPlaid && (
              <button
                onClick={onDisconnectAllPlaid}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-error hover:bg-error/5 transition-colors"
              >
                Disconnect
              </button>
            )}
            {plaidInstitutions.length > 0 && (
              <Link href="/finance/accounts" className="text-xs text-primary hover:underline">
                Manage accounts
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-foreground-muted">
              Get your keys at{" "}
              <a
                href="https://dashboard.plaid.com/developers/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                dashboard.plaid.com
              </a>
              . Apply for free Development access to connect real bank accounts with limited usage.
            </p>
            {showPlaidForm && plaidKeyForm ? (
              <div className="border-t border-card-border/40 pt-3">
                {plaidKeyForm}
              </div>
            ) : (
              <button
                onClick={() => setShowPlaidForm(true)}
                className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
              >
                <span className="material-symbols-rounded text-base">key</span>
                Add Plaid Key
              </button>
            )}
          </>
        )}
      </div>

      {/* SimpleFIN */}
      <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">SimpleFIN</p>
            <p className="text-xs text-foreground-muted mt-0.5">
              Direct setup-token connection via SimpleFIN Bridge
            </p>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
            simplefinInstitutions.length > 0 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}>
            {simplefinInstitutions.length > 0 ? "Connected" : "Not connected"}
          </span>
        </div>

        {/* Connected institutions + accounts */}
        {simplefinInstitutions.length > 0 && (
          <div className="space-y-2 border-t border-card-border/40 pt-3">
            {simplefinInstitutions.map((inst) => (
              <div key={inst.id} className="group/inst">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">{inst.institutionName}</p>
                  {onDisconnect && (
                    <button
                      onClick={() => onDisconnect(inst.id, inst.institutionName)}
                      className="text-[10px] text-foreground-muted/40 hover:text-error transition-colors shrink-0 opacity-0 group-hover/inst:opacity-100"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {inst.accounts && inst.accounts.length > 0 && (
                  <div className="ml-3 mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {inst.accounts.map((acct) => (
                      <div key={acct.id} className="flex items-center justify-between gap-2 py-0.5 group">
                        <span className="text-[11px] text-foreground-muted truncate">
                          {acct.name}
                          {acct.mask && <span className="text-foreground-muted/50 ml-1">****{acct.mask}</span>}
                          <span className="text-foreground-muted/40 ml-1 capitalize">{acct.type}</span>
                        </span>
                        {onRemoveAccount && (
                          <button
                            onClick={() => onRemoveAccount(acct.id, acct.name)}
                            className="text-[10px] text-foreground-muted/40 hover:text-error transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {simplefinInstitutions.length > 0 ? (
            <>
              {onSyncSimplefin && (
                <button
                  onClick={onSyncSimplefin}
                  disabled={isSyncingSimplefin}
                  className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  <span className={`material-symbols-rounded text-base ${isSyncingSimplefin ? "animate-spin" : ""}`}>
                    sync
                  </span>
                  {isSyncingSimplefin ? "Syncing..." : "Refresh"}
                </button>
              )}
              {onDisconnectAllSimplefin && (
                <button
                  onClick={onDisconnectAllSimplefin}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-error hover:bg-error/5 transition-colors"
                >
                  Disconnect
                </button>
              )}
              <Link href="/finance/accounts" className="text-xs text-primary hover:underline">
                View accounts
              </Link>
            </>
          ) : (
            <SimpleFINConnect
              onConnect={async (setupToken) => {
                const result = await connectSF.mutateAsync(setupToken)
                toast.success(`Connected ${result.institutionName}`)
              }}
              isLoading={connectSF.isPending}
              buttonLabel="Connect via SimpleFIN"
              className="btn-secondary flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
            />
          )}
        </div>
      </div>

      {/* Manual Uploads */}
      {manualInstitutions.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-5 space-y-3 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Manual Uploads</p>
              <p className="text-xs text-foreground-muted mt-0.5">
                Institutions added via CSV statement upload
              </p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-card-border/40 text-foreground-muted">
              {manualInstitutions.length} {manualInstitutions.length === 1 ? "source" : "sources"}
            </span>
          </div>
          <div className="space-y-1 border-t border-card-border/40 pt-3">
            {manualInstitutions.map((inst) => (
              <div key={inst.id} className="flex items-center justify-between gap-2 py-1">
                <span className="text-xs text-foreground truncate">{inst.institutionName}</span>
                {onDisconnect && (
                  <button
                    onClick={() => onDisconnect(inst.id, inst.institutionName)}
                    className="text-[11px] text-foreground-muted hover:text-error transition-colors shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
