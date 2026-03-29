"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { useAccountCoverage, useUploadStatement } from "@/hooks/finance"
import { UploadDropZone, type PreviewState } from "./upload-drop-zone"
import { UploadAccountStep } from "./upload-account-step"
import { UploadConfirmStep } from "./upload-confirm-step"
import type { FilenameMetadata } from "@/lib/finance/statement-filename-parser"
import type { StatementUploadResult } from "@/lib/finance/statement-types"

export function StatementUploadFlow() {
  const { data } = useAccountCoverage()
  const upload = useUploadStatement()

  const [file, setFile] = useState<File | null>(null)
  const [isPDF, setIsPDF] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [meta, setMeta] = useState<FilenameMetadata | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [selectedAccountName, setSelectedAccountName] = useState("")
  const [result, setResult] = useState<StatementUploadResult | null>(null)

  const accounts = data?.accounts ?? []

  const handleFileAccepted = useCallback((f: File, pdf: boolean, prev: PreviewState | null, fileMeta: FilenameMetadata) => {
    setFile(f)
    setIsPDF(pdf)
    setPreview(prev)
    setMeta(fileMeta)
    setResult(null)
    // Don't reset account selection — allows uploading multiple files to same account
  }, [])

  const handleAccountSelected = useCallback((id: string, name: string) => {
    setSelectedAccountId(id)
    setSelectedAccountName(name)
    setResult(null)
  }, [])

  const handleUpload = useCallback(() => {
    if (!file || !selectedAccountId) return
    // Capture account at upload time to prevent race with account selector changes
    const uploadAccountId = selectedAccountId
    upload.mutate(
      { file, accountId: uploadAccountId },
      {
        onSuccess: (res) => {
          setResult(res)
          if (res.inserted > 0) toast.success(`Imported ${res.inserted} transactions`)
          else toast.info("No new transactions — all rows already exist")
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }, [file, selectedAccountId, upload])

  const handleReset = useCallback(() => {
    setFile(null)
    setIsPDF(false)
    setPreview(null)
    setMeta(null)
    setResult(null)
    // Keep account selected for sequential uploads
  }, [])

  const selectedAccount = accounts.find((a) => a.accountId === selectedAccountId) ?? null
  const coverage = selectedAccount
    ? {
        earliest: selectedAccount.earliestTransaction,
        latest: selectedAccount.latestTransaction,
        months: selectedAccount.monthsWithData.length,
        gaps: selectedAccount.monthsMissing.length,
        percent: selectedAccount.coveragePercent,
      }
    : null

  return (
    <div className="space-y-4">
      {/* Step 1: Drop zone — always visible */}
      <UploadDropZone
        file={file}
        isPDF={isPDF}
        preview={preview}
        meta={meta}
        onFileAccepted={handleFileAccepted}
      />

      {/* Step 2: Account selection — appears after file drop, locked during upload */}
      {file && (
        <UploadAccountStep
          accounts={accounts}
          meta={meta}
          selectedAccountId={selectedAccountId || null}
          onAccountSelected={handleAccountSelected}
          disabled={upload.isPending}
        />
      )}

      {/* Step 3: Preview + Upload — appears after account selected */}
      {file && selectedAccountId && (
        <UploadConfirmStep
          isPDF={isPDF}
          preview={preview}
          accountName={selectedAccount?.accountName ?? selectedAccountName}
          onUpload={handleUpload}
          onReset={handleReset}
          result={result}
          isUploading={upload.isPending}
          coverage={coverage}
        />
      )}
    </div>
  )
}
