"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { previewStatement, FORMAT_LABELS } from "@/lib/finance/statement-parser"
import { parseStatementFilename, type FilenameMetadata } from "@/lib/finance/statement-filename-parser"
import type { BankFormat, ParsedRow } from "@/lib/finance/statement-types"

export interface PreviewState {
  format: BankFormat
  rows: ParsedRow[]
  totalLines: number
}

interface Props {
  file: File | null
  isPDF: boolean
  preview: PreviewState | null
  meta: FilenameMetadata | null
  onFileAccepted: (file: File, isPDF: boolean, preview: PreviewState | null, meta: FilenameMetadata) => void
}

const MAX_CLIENT_FILE_SIZE = 5 * 1024 * 1024 // 5MB — matches server limit

export function UploadDropZone({ file, isPDF, preview, meta, onFileAccepted }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const readerRef = useRef<FileReader | null>(null)

  // Abort in-flight FileReader on unmount
  useEffect(() => {
    return () => { readerRef.current?.abort() }
  }, [])

  const processFile = useCallback((f: File) => {
    const name = f.name.toLowerCase()
    const pdf = name.endsWith(".pdf")
    const csv = name.endsWith(".csv")
    if (!pdf && !csv) {
      toast.error("Unsupported file type — please select a CSV or PDF")
      return
    }
    if (f.size > MAX_CLIENT_FILE_SIZE) {
      toast.error(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB) — max 5MB`)
      return
    }
    if (f.size === 0) {
      toast.error("File is empty")
      return
    }
    const fileMeta = parseStatementFilename(f.name)
    if (csv) {
      readerRef.current?.abort()
      const reader = new FileReader()
      readerRef.current = reader
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (!text || text.trim().length === 0) {
          toast.error("CSV file appears to be empty")
          return
        }
        const p = previewStatement(text, 5)
        onFileAccepted(f, false, { format: p.format, rows: p.rows, totalLines: p.totalLines }, fileMeta)
      }
      reader.onerror = () => {
        toast.error(`Failed to read ${f.name}`)
      }
      reader.readAsText(f)
    } else {
      onFileAccepted(f, true, null, fileMeta)
    }
  }, [onFileAccepted])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }, [processFile])

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={file ? `Selected file: ${file.name}. Click to replace.` : "Drop a bank statement here or click to browse"}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click() } }}
        className={cn(
          "border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40",
          file ? "p-4" : "p-8",
          dragOver ? "border-primary bg-primary/5"
            : file ? "border-success/40 bg-success/5"
            : "border-card-border hover:border-foreground-muted/40"
        )}
      >
        {file ? (
          <div className="flex items-center gap-3">
            <span className="material-symbols-rounded text-success" style={{ fontSize: 24 }}>description</span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] text-foreground-muted">{(file.size / 1024).toFixed(0)} KB</span>
                {isPDF && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    <span className="material-symbols-rounded" style={{ fontSize: 11 }}>auto_awesome</span>
                    AI parsing
                  </span>
                )}
                {preview && !isPDF && (
                  <span className="text-[10px] font-medium text-success bg-success/10 px-1.5 py-0.5 rounded">
                    {FORMAT_LABELS[preview.format]} &middot; {preview.totalLines} rows
                  </span>
                )}
                {meta?.bank && (
                  <span className="text-[10px] font-medium text-foreground-muted bg-foreground/5 px-1.5 py-0.5 rounded">{meta.bank}</span>
                )}
                {meta?.mask && (
                  <span className="text-[10px] font-medium text-foreground-muted bg-foreground/5 px-1.5 py-0.5 rounded">****{meta.mask}</span>
                )}
              </div>
            </div>
            <span className="text-[11px] text-foreground-muted hover:text-foreground">Replace</span>
          </div>
        ) : (
          <div>
            <span className="material-symbols-rounded text-foreground-muted/40 mb-2 block" style={{ fontSize: 36 }}>cloud_upload</span>
            <p className="text-sm font-medium text-foreground">Drop a bank statement here</p>
            <p className="text-[11px] text-foreground-muted mt-1">
              CSV or PDF &middot; Auto-detects Chase, Amex, BofA, Wells Fargo, Capital One, Discover, and more
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf"
          className="hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = "" }}
        />
      </div>
    </div>
  )
}
